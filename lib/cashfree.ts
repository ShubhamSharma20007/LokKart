/**
 * Cashfree Payment Gateway — Server-side helper
 * API version: 2023-08-01
 * Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
 */

import crypto from "node:crypto";

/**
 * Returns Cashfree API base URL.
 * Automatically detects whether to use sandbox or production:
 * 1. Explicit CASHFREE_MODE="production" or "sandbox"
 * 2. If CASHFREE_APP_ID starts with "TEST" or secret contains "_test_", ALWAYS use sandbox.
 * 3. Default: production in NODE_ENV===production only if not a test key.
 */
export function getCashfreeBaseUrl(): string {
  if (process.env.CASHFREE_MODE === "production") return "https://api.cashfree.com/pg";
  if (process.env.CASHFREE_MODE === "sandbox") return "https://sandbox.cashfree.com/pg";

  const appId = process.env.CASHFREE_APP_ID || "";
  const secret = process.env.CASHFREE_APP_SECRET_KEY || "";

  // If using test credentials, hit sandbox even in production environment
  if (appId.startsWith("TEST") || secret.includes("_test_")) {
    return "https://sandbox.cashfree.com/pg";
  }

  return process.env.NODE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function isCashfreeProduction(): boolean {
  return getCashfreeBaseUrl() === "https://api.cashfree.com/pg";
}

function getCashfreeHeaders() {
  return {
    "x-api-version": "2023-08-01",
    "x-client-id": process.env.CASHFREE_APP_ID?.trim() || "",
    "x-client-secret": process.env.CASHFREE_APP_SECRET_KEY?.trim() || "",
    "Content-Type": "application/json",
  };
}

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
  | { ok: true; paymentSessionId: string; cfOrderId: string; paymentMode: "production" | "sandbox" }
  | { ok: false; error: string };

export async function createCashfreeOrder(
  params: CreateOrderParams
): Promise<CreateOrderResult> {
  try {
    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();
    const isProd = isCashfreeProduction();

    if (!headers["x-client-id"] || !headers["x-client-secret"]) {
      console.error("[Cashfree] Missing CASHFREE_APP_ID or CASHFREE_APP_SECRET_KEY in environment");
      return { ok: false, error: "Payment gateway credentials are not configured on the server." };
    }

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

    console.log(`[Cashfree] Creating order ${params.orderId} on ${baseUrl}`);

    const res = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers,
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
      paymentMode: isProd ? "production" : "sandbox",
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
    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();

    const res = await fetch(`${baseUrl}/orders/${cfOrderId}`, {
      method: "GET",
      headers,
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
        const pmtRes = await fetch(`${baseUrl}/orders/${cfOrderId}/payments`, {
          method: "GET",
          headers,
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
