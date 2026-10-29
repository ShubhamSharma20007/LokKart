import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEV-ONLY: Simulate NimbusPost webhook events locally.
 *
 * Only works when NODE_ENV !== "production".
 *
 * POST /api/webhooks/nimbus/test
 * Body: { orderId: string, event: "CONFIRMED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" }
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/webhooks/nimbus/test \
 *     -H "Content-Type: application/json" \
 *     -d '{"orderId":"ORD-XXXXX","event":"SHIPPED"}'
 */
export async function POST(req: NextRequest) {
  // Strictly block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  let body: { orderId?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, event } = body;
  if (!orderId || !event) {
    return NextResponse.json({ error: "orderId and event are required" }, { status: 400 });
  }

  // Map test event to Bachatnix status
  const statusMap: Record<string, string> = {
    CONFIRMED: "CONFIRMED",
    PICKUP_SCHEDULED: "CONFIRMED",
    SHIPPED: "SHIPPED",
    IN_TRANSIT: "SHIPPED",
    OUT_FOR_DELIVERY: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    RTO: "CANCELLED",
  };

  const newStatus = statusMap[event.toUpperCase()];
  if (!newStatus) {
    return NextResponse.json(
      { error: `Unknown event. Valid events: ${Object.keys(statusMap).join(", ")}` },
      { status: 400 },
    );
  }

  // Find order by ref (ORD-XXXXX) or DB id
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ ref: orderId }, { id: orderId }, { nimbusOrderId: orderId }],
    },
    include: {
      items: { select: { productId: true, qty: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: `Order "${orderId}" not found` }, { status: 404 });
  }

  if ((order.status as string) === "CANCELLED") {
    return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
  }

  // Simulate AWB & courier if not already set
  const fakeAwb = order.awb || `DEVAWB${Date.now().toString().slice(-8)}`;
  const fakeCourier = order.courierName || "Dev Courier (Simulated)";

  // Handle stock restoral on CANCELLED
  if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus as "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED",
      paymentStatus:
        newStatus === "DELIVERED" && order.paymentMethod === "COD"
          ? "PAID"
          : order.paymentStatus,
      awb: fakeAwb,
      courierName: fakeCourier,
      trackingUrl:
        order.trackingUrl || `https://ship.nimbuspost.com/shipping/tracking/${fakeAwb}`,
    },
  });

  console.log(
    `[NimbusWebhook][DEV] Simulated event="${event}" for order ${order.ref} → status=${newStatus}, awb=${fakeAwb}`,
  );

  return NextResponse.json({
    success: true,
    message: `Order ${order.ref} updated to ${newStatus}`,
    order: {
      id: order.id,
      ref: order.ref,
      oldStatus: order.status,
      newStatus,
      awb: fakeAwb,
      courierName: fakeCourier,
    },
  });
}
