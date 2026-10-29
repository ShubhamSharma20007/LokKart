"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/imagekit-server";
import { sendOrderShippedNotification } from "@/lib/mailer";
import {
  createNimbusOrder,
  bookNimbusShipment,
  scheduleNimbusPickup,
  getNimbusShippingLabels,
  mergeParcelDimensions,
} from "@/lib/nimbuspost";

type OrderStatus = "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED";

const STATUSES: OrderStatus[] = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "FAILED"];

export type AdminOrder = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  total: number;
  paymentMethod: "COD" | "UPI";
  paymentStatus: PaymentStatus;
  upiTxnId: string | null;
  status: OrderStatus;
  createdAt: string;
  address: { address?: string; city?: string; state?: string; pincode?: string };
  items: { id: string; title: string; qty: number }[];
  nimbusOrderId?: string | null;
  awb?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
};

export type AdminOrdersResult =
  | { ok: true; orders: AdminOrder[]; total: number; page: number; totalPages: number }
  | { ok: false; message: string };

export async function listAdminOrders(
  idToken: string,
  page = 1,
  filter: "ALL" | PaymentStatus = "ALL",
  pageSize = 10,
): Promise<AdminOrdersResult> {
  try {
    await requireAdmin(idToken);
  } catch {
    return { ok: false, message: "Only admins can view orders." };
  }

  try {
    const where = filter !== "ALL" && PAYMENT_STATUSES.includes(filter) ? { paymentStatus: filter } : {};
    const total = await prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);

    const rows = await prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (current - 1) * pageSize,
      take: pageSize,
      include: { items: { select: { id: true, title: true, qty: true } } },
    });

    return {
      ok: true,
      total,
      page: current,
      totalPages,
      orders: rows.map((o) => ({
        id: o.id,
        ref: o.ref,
        name: o.name,
        phone: o.phone,
        total: o.total,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        upiTxnId: o.upiTxnId,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        address: { address: o.address, city: o.city, state: o.state, pincode: o.pincode },
        // address: (o.address ?? {}) as AdminOrder["address"],
        items: o.items,
        nimbusOrderId: o.nimbusOrderId,
        awb: o.awb,
        courierName: o.courierName,
        trackingUrl: o.trackingUrl,
        labelUrl: o.labelUrl,
      })),
    };
  } catch (err) {
    console.error("listAdminOrders failed", err);
    return { ok: false, message: "We could not load the orders. Please try again." };
  }
}

export type UpdateOrderResult = { ok: true } | { ok: false; message: string };

// Rules:
//  - Rejecting a payment cancels the order.
//  - Cancelling an order puts its stock back.
//  - Delivering a COD order marks it paid (the cash was collected).
//  - A cancelled order is final.
export async function updateOrder(
  idToken: string,
  orderId: string,
  change: { status?: OrderStatus; paymentStatus?: PaymentStatus },
): Promise<UpdateOrderResult> {
  try {
    await requireAdmin(idToken);
  } catch {
    return { ok: false, message: "Only admins can update orders." };
  }

  if (change.status && !STATUSES.includes(change.status)) return { ok: false, message: "Invalid order status." };
  if (change.paymentStatus && !PAYMENT_STATUSES.includes(change.paymentStatus)) {
    return { ok: false, message: "Invalid payment status." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          items: { select: { productId: true, qty: true } },
        },
      });
      if (!o) throw new Error("NOT_FOUND");
      if (o.status === "CANCELLED") throw new Error("CANCELLED");

      let status = change.status ?? o.status;
      let paymentStatus = change.paymentStatus ?? o.paymentStatus;

      if (change.paymentStatus === "FAILED") status = "CANCELLED";
      if (status === "DELIVERED" && o.paymentMethod === "COD") paymentStatus = "PAID";

      if (status === "CANCELLED") {
        for (const i of o.items) {
          await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.qty } } });
        }
      }

      await tx.order.update({ where: { id: orderId }, data: { status, paymentStatus } });
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return { ok: false, message: "That order no longer exists." };
    if (err instanceof Error && err.message === "CANCELLED") return { ok: false, message: "Cancelled orders can't be changed." };
    console.error("updateOrder failed", err);
    return { ok: false, message: "We could not update the order. Please try again." };
  }
}

export type DispatchOrderResult =
  | {
      ok: true;
      awb: string;
      courierName: string;
      trackingUrl?: string;
      labelUrl?: string;
    }
  | { ok: false; message: string };

/**
 * Admin action: Dispatches an order via NimbusPost.
 * 1. If order was not yet created on NimbusPost (e.g. UPI order), creates the draft order first.
 * 2. Calls POST /v2/shipments/book to book courier & allocate AWB.
 * 3. Calls POST /v2/shipments/pickup to schedule courier pickup at warehouse.
 * 4. Generates shipping label and updates DB order to CONFIRMED with AWB & tracking links.
 */
export async function dispatchOrderViaNimbus(
  idToken: string,
  orderId: string,
  pickupDate?: string,
): Promise<DispatchOrderResult> {
  try {
    await requireAdmin(idToken);
  } catch {
    return { ok: false, message: "Only admins can dispatch orders." };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                weightG: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
              },
            },
          },
        },
      },
    });

    if (!order) return { ok: false, message: "Order not found." };
    if (order.status === "CANCELLED") return { ok: false, message: "Cannot dispatch a cancelled order." };
    if (order.awb) {
      return {
        ok: true,
        awb: order.awb,
        courierName: order.courierName || "Courier Partner",
        trackingUrl: order.trackingUrl || undefined,
        labelUrl: order.labelUrl || undefined,
      };
    }

    let nimbusOrderId = order.nimbusOrderId;

    // 1. If not yet created on NimbusPost, create it first
    if (!nimbusOrderId) {
      const parcel = mergeParcelDimensions(
        order.items.map((it) => ({
          qty: it.qty,
          weightG: it.product?.weightG ?? 200,
          lengthCm: it.product?.lengthCm ?? 25,
          widthCm: it.product?.widthCm ?? 20,
          heightCm: it.product?.heightCm ?? 3,
        })),
      );

      const createRes = await createNimbusOrder({
        order_number: order.ref,
        payment_mode: order.paymentMethod === "COD" ? "COD" : "PREPAID",
        total_amount: String(order.paymentMethod === "COD" ? order.total : 0),
        consignee: {
          name: order.name,
          phone: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
        },
        package_weight: parcel.weightKg,
        package_length: parcel.lengthCm,
        package_breadth: parcel.breadthCm,
        package_height: parcel.heightCm,
        order_items: order.items.map((it) => ({
          name: it.title,
          sku: `SKU-${it.productId.slice(-6).toUpperCase()}`,
          units: it.qty,
          selling_price: String(it.price),
        })),
      });

      if (!createRes.ok) {
        return { ok: false, message: `NimbusPost creation failed: ${createRes.error}` };
      }
      nimbusOrderId = createRes.nimbusOrderId;
    }

    // 2. Book courier & generate AWB
    const bookRes = await bookNimbusShipment(nimbusOrderId);
    if (!bookRes.ok) {
      return { ok: false, message: `Courier booking failed: ${bookRes.error}` };
    }

    // 3. Schedule courier pickup
    // DEV: set NIMBUS_SKIP_PICKUP=true in .env.local to skip physical pickup during development.
    // PROD: remove the var or set to "false" so courier actually comes.
    const skipPickup = process.env.NIMBUS_SKIP_PICKUP === "true";
    if (skipPickup) {
      console.log(`[NimbusPost] DEV MODE: Pickup scheduling skipped for ${nimbusOrderId}. Set NIMBUS_SKIP_PICKUP=false in production.`);
    } else {
      await scheduleNimbusPickup(nimbusOrderId, pickupDate);
    }

    // 4. Fetch shipping label
    let labelUrl = bookRes.labelUrl;
    if (!labelUrl) {
      const labelRes = await getNimbusShippingLabels(nimbusOrderId);
      if (labelRes.ok) labelUrl = labelRes.labelUrl;
    }

    // 5. Update DB
    await prisma.order.update({
      where: { id: order.id },
      data: {
        nimbusOrderId,
        status: "CONFIRMED",
        awb: bookRes.awb,
        courierName: bookRes.courierName,
        trackingUrl: bookRes.trackingUrl,
        labelUrl,
      },
    });

    return {
      ok: true,
      awb: bookRes.awb,
      courierName: bookRes.courierName,
      trackingUrl: bookRes.trackingUrl,
      labelUrl,
    };
  } catch (err) {
    console.error("dispatchOrderViaNimbus failed", err);
    return { ok: false, message: "Could not dispatch the order. Please try again." };
  }
}
