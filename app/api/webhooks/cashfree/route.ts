import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCashfreeWebhook } from "@/lib/cashfree";
import { sendOrderPlacedNotification } from "@/lib/mailer";


type CashfreeWebhookPayload = {
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
    };
  };
  event_time?: string;
  type?: string;
};

export async function POST(req: NextRequest) {
  // 1. Read raw body text for signature verification
  const rawBody = await req.text();

  // 2. Get signature headers
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  // 3. Verify signature
  if (!timestamp || !signature || !verifyCashfreeWebhook(rawBody, timestamp, signature)) {
    console.warn("[Cashfree Webhook] Invalid signature received");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 4. Parse payload
  let payload: CashfreeWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
  } catch {
    console.error("[Cashfree Webhook] Failed to parse payload");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const eventType = payload.type ?? "";
  const cfOrderId = payload.data?.order?.order_id ?? "";
  const cfPaymentId = payload.data?.payment?.cf_payment_id
    ? String(payload.data.payment.cf_payment_id)
    : undefined;

  console.log(`[Cashfree Webhook] event=${eventType} orderId=${cfOrderId}`);

  // 5. Handle events
  if (!cfOrderId) {
    // Nothing actionable
    return NextResponse.json({ ok: true });
  }

  try {
    if (eventType === "PAYMENT_SUCCESS") {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ cashfreeOrderId: cfOrderId }, { ref: cfOrderId }],
        },
        select: { id: true, paymentStatus: true },
      });

      if (order && order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            status: "PLACED",
            ...(cfPaymentId ? { upiTxnId: cfPaymentId } : {}),
          },
        });
        console.log(`[Cashfree Webhook] PAID: order id=${order.id}, ref=${cfOrderId}`);
        void sendOrderPlacedNotification(order.id);
      }
    } else if (
      eventType === "PAYMENT_FAILED" ||
      eventType === "PAYMENT_USER_DROPPED"
    ) {
      // Find order and restore stock
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ cashfreeOrderId: cfOrderId }, { ref: cfOrderId }],
        },
        select: {
          id: true,
          paymentStatus: true,
          items: { select: { productId: true, qty: true } },
        },
      });

      if (order && order.paymentStatus === "PENDING") {
        await prisma.$transaction(async (tx) => {
          // Restore stock
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            });
          }
          // Mark order as failed/cancelled
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
              status: "CANCELLED",
            },
          });
        });
        console.log(`[Cashfree Webhook] FAILED/DROPPED: order id=${order.id}, stock restored`);
      }
    } else if (eventType === "PAYMENT_PENDING") {
      // Log only — no action needed
      console.log(`[Cashfree Webhook] PENDING: order=${cfOrderId}`);
    } else {
      console.log(`[Cashfree Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error("[Cashfree Webhook] DB update error:", err);
    // Still return 200 so Cashfree doesn't retry infinitely
  }

  // 6. Return 200 quickly
  return NextResponse.json({ ok: true });
}
