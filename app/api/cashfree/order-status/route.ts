import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCashfreeOrderStatus } from "@/lib/cashfree";
import { sendOrderPlacedNotification } from "@/lib/mailer";


/**
 * GET /api/cashfree/order-status?orderId=ORD-XXXXX
 * Looks up our DB for cashfreeOrderId, then queries Cashfree for live status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderRef = searchParams.get("orderId") ?? "";

  if (!orderRef) {
    return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
  }

  // Find order in DB by ref
  const order = await prisma.order.findFirst({
    where: { ref: orderRef },
    select: { id: true, ref: true, cashfreeOrderId: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  // If already PAID in our DB (webhook came first), return immediately
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, status: "PAID" });
  }
  if (order.paymentStatus === "FAILED") {
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  // Query Cashfree for live status using merchant orderRef (Cashfree's order_id)
  let result = await getCashfreeOrderStatus(order.ref);
  if (!result.ok && order.cashfreeOrderId && order.cashfreeOrderId !== order.ref) {
    const fallback = await getCashfreeOrderStatus(order.cashfreeOrderId);
    if (fallback.ok) result = fallback;
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  // If Cashfree says PAID but DB is still PENDING, update DB proactively
  if (result.status === "PAID" && order.paymentStatus === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "PLACED",
        ...(result.txnId ? { upiTxnId: result.txnId } : {}),
      },
    });
    void sendOrderPlacedNotification(order.id);
  }

  return NextResponse.json({ ok: true, status: result.status });
}
