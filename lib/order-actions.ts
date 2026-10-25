"use server";

import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";

export type OrderView = {
  id: string;
  ref: string;
  total: number;
  paymentMethod: "COD" | "UPI";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  status: "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  address: { address?: string; city?: string; state?: string; pincode?: string };
  items: { id: string; productId: string; title: string; qty: number; price: number }[];
};

export type OrdersResult = { ok: true; orders: OrderView[] } | { ok: false; message: string };

export async function getMyOrders(idToken: string): Promise<OrdersResult> {
  try {
    const c = await verifyFirebaseToken(idToken);
    const user = await prisma.user.findFirst({
      where: { OR: [{ firebaseUid: c.uid }, ...(c.email ? [{ email: c.email }] : [])] },
      select: { id: true },
    });
    if (!user) return { ok: true, orders: [] };

    const rows = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return {
      ok: true,
      orders: rows.map((o) => ({
        id: o.id,
        ref: o.ref,
        total: o.total,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        address: (o.address ?? {}) as OrderView["address"],
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          title: i.title,
          qty: i.qty,
          price: i.price,
        })),
      })),
    };
  } catch (err) {
    console.error("getMyOrders failed", err);
    return { ok: false, message: "We could not load your orders. Please try again." };
  }
}