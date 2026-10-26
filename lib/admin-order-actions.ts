"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/imagekit-server";

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
        address: (o.address ?? {}) as AdminOrder["address"],
        items: o.items,
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