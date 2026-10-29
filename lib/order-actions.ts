"use server";

import { prisma } from "@/lib/prisma";
import { getCodEstimate, type ShipItem } from "@/lib/shipping";
import { verifyFirebaseToken } from "@/lib/firebase-token";
import { getUserFromToken } from "@/lib/imagekit-server";
import {
  createNimbusOrder,
  mergeParcelDimensions,
  bookNimbusShipment,
  scheduleNimbusPickup,
  trackNimbusOrder,
} from "@/lib/nimbuspost";
import { sendOrderPlacedNotification } from "@/lib/mailer";
type Input = {
  token: string;
  payment: "COD" | "UPI";
  utr?: string;
  address: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
  items: { id: string; qty: number }[];
};
type Result =
  | { ok: true; orderId: string }
  | { ok: false; message: string; errors?: Record<string, string> };


  const makeRef = () => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
export type MyOrder = {
  id: string;
  ref: string;
  total: number;
  status: "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod: "COD" | "UPI";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  address: { address: string; city: string; state: string; pincode: string };
  items: { id: string; productId: string; title: string; qty: number; price: number }[];
  nimbusOrderId?: string | null;
  awb?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
};


export type MyOrdersResult =
  | { ok: true; orders: MyOrder[] }
  | { ok: false; message: string };


/**
 * placeOrder — COD ONLY.
 * UPI payments are now handled by Cashfree via /api/cashfree/create-order route.
 * The manual UTR flow has been removed.
 */
export async function placeOrder(input: Input): Promise<Result> {
  // Guard: this action only handles COD now
  if (input.payment === "UPI") {
    return { ok: false, message: "UPI payments are handled via Cashfree. Please use the checkout page." };
  }
  // 1. Who is ordering
  const decoded = await verifyFirebaseToken(input.token).catch(() => null);
  if (!decoded || !decoded.email) return { ok: false, message: "Please sign in with Google to place your order." };

  const user = await prisma.user.findUnique({ where: { email: decoded.email } });
  if (!user) return { ok: false, message: "Account not found. Please sign in again." };

  // 1b. COD Anti-Spam & Fraud Protection:
  // - Cooldown: Prevent automated rapid-fire COD orders (60 seconds between orders)
  // - Limit: Max 3 active unfulfilled COD orders per user or phone number
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentCodOrder = await prisma.order.findFirst({
    where: {
      userId: user.id,
      paymentMethod: "COD",
      createdAt: { gte: oneMinuteAgo },
    },
    select: { id: true },
  });
  if (recentCodOrder) {
    return {
      ok: false,
      message: "Please wait a minute before placing another Cash on Delivery order.",
    };
  }

  const activeCodOrdersCount = await prisma.order.count({
    where: {
      OR: [{ userId: user.id }, { phone: input.address.phone }],
      paymentMethod: "COD",
      status: { in: ["PLACED", "CONFIRMED"] },
      paymentStatus: "PENDING",
    },
  });

  if (activeCodOrdersCount >= 3) {
    return {
      ok: false,
      message:
        "You already have 3 active Cash on Delivery orders in progress. Please use UPI to place more orders or wait for your current orders to be delivered.",
    };
  }

  // 2. Validate address
  const a = input.address;
  if (!/^[1-9]\d{5}$/.test(a.pincode)) return { ok: false, message: "Invalid pincode.", errors: { pincode: "Invalid pincode" } };
  if (!/^[6-9]\d{9}$/.test(a.phone)) return { ok: false, message: "Invalid phone.", errors: { phone: "Invalid phone" } };
  if (!a.name.trim() || !a.address.trim() || !a.city.trim() || !a.state.trim()) {
    return { ok: false, message: "Please fill in the full address." };
  }

  // 3. Prices and stock come from the DB, never from the browser
  const wanted = input.items.filter((i) => i.qty > 0 && Number.isInteger(i.qty));
  if (wanted.length === 0) return { ok: false, message: "Your cart is empty." };

  const products = await prisma.product.findMany({
    where: { id: { in: wanted.map((i) => i.id) } },
    select: { id: true, title: true, price: true, stock: true, weightG: true, lengthCm: true, widthCm: true, heightCm: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const ship: ShipItem[] = [];
  const lines: { productId: string; title: string; price: number; qty: number }[] = [];
  // Also keep a richer version for NimbusPost payload
  const nimbusItems: { name: string; sku: string; units: number; selling_price: string; weightG: number; lengthCm: number; widthCm: number; heightCm: number }[] = [];

  for (const i of wanted) {
    const p = byId.get(i.id);
    if (!p) return { ok: false, message: "A product in your cart is no longer available." };
    if (p.stock < i.qty) return { ok: false, message: `Only ${p.stock} left for "${p.title}".` };
    subtotal += p.price * i.qty;
    ship.push({ qty: i.qty, weightG: p.weightG, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm });
    lines.push({ productId: p.id, title: p.title, price: p.price, qty: i.qty });
    nimbusItems.push({
      name: p.title.slice(0, 100),
      sku: p.id.slice(0, 50),
      units: i.qty,
      selling_price: String(p.price),
      weightG: p.weightG,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
    });
  }

  // 4. COD charges, recalculated on the server
  let shipping = 0;
  let codCharge = 0;
  if (input.payment === "COD") {
    try {
      const est = await getCodEstimate({ deliveryPincode: a.pincode, orderValueRupees: subtotal, items: ship });
      if (!est.serviceable) return { ok: false, message: "COD is not available for this pincode." };
      shipping = est.shipping;
      codCharge = est.codCharge;
    } catch {
      return { ok: false, message: "Could not calculate COD charges. Please try again." };
    }
  }

  const total = subtotal + shipping + codCharge;
  const orderRef = makeRef();

  // 5. For COD orders, register with NimbusPost FIRST.
  //    If NimbusPost returns an error, we BLOCK order placement completely — no DB record, no stock deduction.
  let nimbusOrderId: string | null = null;
  if (input.payment === "COD") {
    const parcel = mergeParcelDimensions(
      nimbusItems.map((ni) => ({
        qty: ni.units,
        weightG: ni.weightG,
        lengthCm: ni.lengthCm,
        widthCm: ni.widthCm,
        heightCm: ni.heightCm,
      })),
    );

    const result = await createNimbusOrder({
      order_number: orderRef,
      payment_mode: "COD",
      total_amount: String(total),
      pickup_location: process.env.NIMBUS_WAREHOUSE_ID,
      consignee: {
        name: a.name.trim(),
        phone: a.phone,
        address: a.address.trim(),
        city: a.city.trim(),
        state: a.state.trim(),
        pincode: a.pincode,
      },
      package_weight: parcel.weightKg,
      package_length: parcel.lengthCm,
      package_breadth: parcel.breadthCm,
      package_height: parcel.heightCm,
      order_items: nimbusItems.map((ni) => ({
        name: ni.name,
        sku: ni.sku,
        units: ni.units,
        selling_price: ni.selling_price,
      })),
    });

    if (!result.ok) {
      console.error(`[NimbusPost] Order placement blocked for ${orderRef}:`, result.error);
      return {
        ok: false,
        message: `Courier partner error: ${result.error}. Order was not placed.`,
      };
    }

    nimbusOrderId = result.nimbusOrderId;
  }

  // 6. Only if NimbusPost succeeded (or if UPI), create order and reduce stock in DB
  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        const r = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.qty } },
          data: { stock: { decrement: l.qty } },
        });
        if (r.count === 0) throw new Error(`STOCK:${l.title}`);
      }

      return tx.order.create({
        data: {
          ref: orderRef,
          nimbusOrderId,
          upiTxnId: null, // UPI txnId is now set by Cashfree webhook/order-status route
          userId: user.id,
          paymentMethod: input.payment,
          status: "PLACED",
          subtotal,
          shipping,
          codCharge,
          total,
          name: a.name.trim(),
          phone: a.phone,
          address: a.address.trim(),
          city: a.city.trim(),
          state: a.state.trim(),
          pincode: a.pincode,
          items: { create: lines },
        },
        select: { id: true },
      });
    });

    // Send order confirmation email asynchronously
    void sendOrderPlacedNotification(order.id);

    // 7. Future Production Flow: If AUTO_DISPATCH is enabled in env, immediately book courier & schedule pickup
    if (process.env.NIMBUS_AUTO_DISPATCH === "true" && nimbusOrderId) {
      void (async () => {
        try {
          const bookRes = await bookNimbusShipment(nimbusOrderId);
          if (bookRes.ok) {
            await scheduleNimbusPickup(nimbusOrderId);
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "CONFIRMED",
                awb: bookRes.awb,
                courierName: bookRes.courierName,
                trackingUrl: bookRes.trackingUrl,
                labelUrl: bookRes.labelUrl,
              },
            });
            console.log(`[NimbusPost] Auto-dispatched order ${orderRef} with AWB ${bookRes.awb}`);
          }
        } catch (e) {
          console.error(`[NimbusPost] Auto-dispatch failed for ${orderRef}:`, e);
        }
      })();
    }

    return { ok: true, orderId: order.id };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, message: "Duplicate order detected. Please try again." };
    }
    if (e instanceof Error && e.message.startsWith("STOCK:")) {
      return { ok: false, message: `"${e.message.slice(6)}" just went out of stock.` };
    }
    console.error("placeOrder failed", e);
    return { ok: false, message: "Could not place your order. Please try again." };
  }
}


export async function getMyOrders(idToken: string): Promise<MyOrdersResult> {
  try {
    const user = await getUserFromToken(idToken);
    if (!user) return { ok: false, message: "Please sign in to see your orders." };

    const rows = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
        ref: true,
        total: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        nimbusOrderId: true,
        awb: true,
        courierName: true,
        trackingUrl: true,
        labelUrl: true,
        items: { select: { id: true, productId: true, title: true, qty: true, price: true } },
      },
    });

    return {
      ok: true,
      orders: rows.map(({ address, city, state, pincode, createdAt, ...o }) => ({
        ...o,
        createdAt: createdAt.toISOString(),
        address: { address, city, state, pincode },
      })),
    };
  } catch (err) {
    console.error("getMyOrders failed", err);
    return { ok: false, message: "We could not load your orders. Please try again." };
  }
}

export type OrderTrackingResult =
  | {
      ok: true;
      notBooked?: boolean;
      status: string;
      message?: string;
      awb?: string | null;
      courierName?: string | null;
      trackingUrl?: string | null;
      data?: {
        orderId: string;
        orderNumber: string;
        orderStatus: string;
        awb?: string;
        courierName?: string;
        trackingUrl?: string;
        scans: { timestamp: string; status: string; location: string; remark?: string }[];
        latest?: {
          shipStatus?: string;
          statusCode?: string;
          location?: string;
          message?: string;
          eventTime?: string;
        };
      };
    }
  | { ok: false; message: string };

/**
 * On-demand tracking for buyer orders.
 * Fetches real-time timeline checkpoints from NimbusPost.
 */
export async function getOrderTracking(
  idToken: string,
  orderId: string,
): Promise<OrderTrackingResult> {
  try {
    const user = await getUserFromToken(idToken);
    if (!user) return { ok: false, message: "Please sign in to track your order." };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        ref: true,
        status: true,
        nimbusOrderId: true,
        awb: true,
        courierName: true,
        trackingUrl: true,
      },
    });

    if (!order || order.userId !== user.id) {
      return { ok: false, message: "Order not found." };
    }

    if (!order.nimbusOrderId) {
      return {
        ok: true,
        notBooked: true,
        status: order.status,
        message: "Order placed. Awaiting dispatch.",
      };
    }

    const tracking = await trackNimbusOrder(order.nimbusOrderId);
    if (tracking.ok) {
      return {
        ok: true,
        status: order.status,
        awb: tracking.data.awb || order.awb,
        courierName: tracking.data.courierName || order.courierName,
        trackingUrl: tracking.data.trackingUrl || order.trackingUrl,
        data: tracking.data,
      };
    }

    return {
      ok: true,
      notBooked: tracking.notBooked ?? true,
      status: order.status,
      message: tracking.error || "Order confirmed. Courier assignment in progress.",
      awb: order.awb,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
    };
  } catch (err) {
    console.error("getOrderTracking failed", err);
    return { ok: false, message: "Failed to fetch tracking details." };
  }
}