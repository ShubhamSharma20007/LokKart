import { sendOrderShippedNotification, sendOrderDeliveredNotification } from "@/lib/mailer";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyNimbusWebhookSignature,
  mapNimbusStatusToOrderStatus,
} from "@/lib/nimbuspost";


/**
 * NimbusPost Outbound Webhook Handler.
 *
 * Receives real-time shipment & order updates:
 *   - order.created
 *   - order.updated   (courier booked, AWB assigned, cancelled)
 *   - tracking.updated (scanned at hub, out for delivery, delivered, NDR, RTO)
 *
 * Headers:
 *   - x-nimbus-event: event name
 *   - x-nimbus-delivery: unique delivery ID
 *   - x-nimbus-signature: sha256= HMAC-SHA256 of raw body
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nimbus-signature");
    const eventName = req.headers.get("x-nimbus-event") || "unknown";
    const deliveryId = req.headers.get("x-nimbus-delivery");

    // 1. Verify HMAC signature
    const isValid = verifyNimbusWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn(`[NimbusWebhook] Rejected invalid signature for event=${eventName}, delivery=${deliveryId}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const nimbusOrderId = payload.order_id ? String(payload.order_id) : undefined;
    const orderNumber = payload.order_number ? String(payload.order_number) : undefined;
    const awb = payload.awb_number ? String(payload.awb_number) : undefined;
    const courierName = payload.courier_name ? String(payload.courier_name) : undefined;
    const nimbusStatus = payload.status ? String(payload.status) : undefined;

    console.log(
      `[NimbusWebhook] Received event=${eventName} for order=${orderNumber || nimbusOrderId}, status=${nimbusStatus}, awb=${awb}`
    );

    if (!nimbusOrderId && !orderNumber) {
      // Return 200 so Nimbus does not spam retries for malformed events
      return NextResponse.json({ success: true, message: "Ignored (no identifier)" });
    }

    // 2. Find matching order in our database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(nimbusOrderId ? [{ nimbusOrderId }] : []),
          ...(orderNumber ? [{ ref: orderNumber }] : []),
        ],
      },
      include: {
        items: { select: { productId: true, qty: true } },
      },
    });

    if (!order) {
      console.warn(`[NimbusWebhook] Order not found for order_id=${nimbusOrderId}, ref=${orderNumber}`);
      return NextResponse.json({ success: true, message: "Order not found in DB" });
    }

    // 3. Map status to Bachatnix OrderStatus
    const mappedStatus = nimbusStatus ? mapNimbusStatusToOrderStatus(nimbusStatus) : null;
    let newStatus = order.status;
    let newPaymentStatus = order.paymentStatus;

    if (mappedStatus && order.status !== "CANCELLED") {
      newStatus = mappedStatus;
      // If COD order was delivered, mark payment as PAID
      if (mappedStatus === "DELIVERED" && order.paymentMethod === "COD") {
        newPaymentStatus = "PAID";
      }
    }

    // 4. If status transitions to CANCELLED, return stock back to inventory
    if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
      }
    }

    // 5. Update Order record
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        paymentStatus: newPaymentStatus,
        ...(nimbusOrderId && !order.nimbusOrderId ? { nimbusOrderId } : {}),
        ...(awb ? { awb } : {}),
        ...(courierName ? { courierName } : {}),
        ...(awb && !order.trackingUrl
          ? { trackingUrl: `https://ship.nimbuspost.com/shipping/tracking/${awb}` }
          : {}),
      },
    });

    console.log(
      `[NimbusWebhook] Order ${order.ref} updated: status=${newStatus}, awb=${awb || order.awb}`,
    );

    // Trigger emails on status transitions
    if (newStatus === "SHIPPED" && order.status !== "SHIPPED") {
      void sendOrderShippedNotification(order.id);
    } else if (newStatus === "DELIVERED" && order.status !== "DELIVERED") {
      void sendOrderDeliveredNotification(order.id);
    }

    // Return 200 within 60s as required by NimbusPost
    return NextResponse.json({ success: true, deliveryId });
  } catch (err) {
    console.error("[NimbusWebhook] Unexpected error processing webhook:", err);
    // Return 500 so Nimbus will retry if an unexpected transient error occurs
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

