/**
 * Cashfree Payment Gateway — Server-side helper
 * API version: 2023-08-01
 * Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
 */

import crypto from "node:crypto";

const CF_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const CF_HEADERS = {
  "x-api-version": "2023-08-01",
  "x-client-id": process.env.CASHFREE_APP_ID!,
  "x-client-secret": process.env.CASHFREE_APP_SECRET_KEY!,
  "Content-Type": "application/json",
} as const;

// ─── Create Order ────────────────────────────────────────────────────────────

export type CreateOrderParams = {
  orderId: string;       // Our DB order ref e.g. ORD-XXXXX
  amount: number;        // In rupees (e.g. 249)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;     // Where to redirect after payment
};

export type CreateOrderResult =
  | { ok: true; paymentSessionId: string; cfOrderId: string }
  | { ok: false; error: string };

export async function createCashfreeOrder(
  params: CreateOrderParams
): Promise<CreateOrderResult> {
  try {
    const body = {
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: params.orderId,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
      },
      order_meta: {
        return_url: params.returnUrl,
        ...(process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
          ? { notify_url: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/cashfree` }
          : {}),
      },
    };

    const res = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: CF_HEADERS,
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      payment_session_id?: string;
      cf_order_id?: string;
      message?: string;
      code?: string;
    };

    if (!res.ok || !json.payment_session_id || !json.cf_order_id) {
      const msg = json.message ?? json.code ?? `HTTP ${res.status}`;
      console.error("[Cashfree] createOrder error:", msg, json);
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      paymentSessionId: json.payment_session_id,
      cfOrderId: String(json.cf_order_id),
    };
  } catch (err) {
    console.error("[Cashfree] createOrder exception:", err);
    return { ok: false, error: "Failed to connect to Cashfree. Please retry." };
  }
}

// ─── Get Order Status ─────────────────────────────────────────────────────────

export type CashfreeStatus = "PAID" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type OrderStatusResult =
  | { ok: true; status: CashfreeStatus; txnId?: string }
  | { ok: false; error: string };

export async function getCashfreeOrderStatus(
  cfOrderId: string
): Promise<OrderStatusResult> {
  try {
    const res = await fetch(`${CF_BASE}/orders/${cfOrderId}`, {
      method: "GET",
      headers: CF_HEADERS,
    });

    const json = (await res.json()) as {
      order_status?: string;
      cf_order_id?: string | number;
      message?: string;
    };

    if (!res.ok) {
      const msg = json.message ?? `HTTP ${res.status}`;
      console.error("[Cashfree] getOrderStatus error:", msg, json);
      return { ok: false, error: msg };
    }

    const rawStatus = (json.order_status ?? "ACTIVE").toUpperCase();
    const status: CashfreeStatus =
      rawStatus === "PAID" || rawStatus === "EXPIRED" || rawStatus === "CANCELLED"
        ? (rawStatus as CashfreeStatus)
        : "ACTIVE";

    // Fetch payment details to get txnId when PAID
    let txnId: string | undefined;
    if (status === "PAID") {
      try {
        const pmtRes = await fetch(`${CF_BASE}/orders/${cfOrderId}/payments`, {
          method: "GET",
          headers: CF_HEADERS,
        });
        const pmtJson = (await pmtRes.json()) as unknown;
        const list = Array.isArray(pmtJson) ? pmtJson : [pmtJson];
        const paid = list.find(
          (p: any) => p && typeof p === "object" && p.payment_status === "SUCCESS"
        );
        if (paid?.cf_payment_id) {
          txnId = String(paid.cf_payment_id);
        }
      } catch {
        // Non-critical — just skip txnId
      }
    }

    return { ok: true, status, txnId };
  } catch (err) {
    console.error("[Cashfree] getOrderStatus exception:", err);
    return { ok: false, error: "Failed to fetch order status." };
  }
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Cashfree signs webhook with:
 *   HMAC-SHA256(timestamp + rawBody, APP_SECRET) → base64
 * Headers: x-webhook-timestamp, x-webhook-signature
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  try {
    const secret = process.env.CASHFREE_APP_SECRET_KEY!;
    const signedPayload = timestamp + rawBody;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("base64");

    const expected = Buffer.from(expectedSig, "base64");
    const received = Buffer.from(signature, "base64");

    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
