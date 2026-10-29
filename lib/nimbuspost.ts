import crypto from "node:crypto";
import type { OrderStatus } from "@/app/generated/prisma/client";

/**
 * NimbusPost v2 API Integration.
 *
 * Architecture:
 *   1. Development / Default Checkout:
 *      POST /v2/orders   → Registers the order in NimbusPost WITHOUT booking a courier.
 *                          No delivery boy comes to your house. 100% safe.
 *
 *   2. Production Dispatch / Booking:
 *      POST /v2/shipments/book   → Books courier (auto top-ranked or courier_id), generates AWB & label.
 *      POST /v2/shipments/pickup → Asks courier partner to come pick up parcel from warehouse.
 *
 *   3. Webhook Synchronization:
 *      NimbusPost sends order.updated and tracking.updated to /api/webhooks/nimbus.
 *      DB status updates automatically to PLACED, CONFIRMED, SHIPPED, DELIVERED.
 *
 *   4. Customer Tracking:
 *      GET /v2/tracking/order/{orderId} → Live scan history & tracking page links.
 */

const NIMBUS_ORDERS_URL = "https://api-v2.nimbuspost.com/v2/orders";

export type NimbusOrderItem = {
  name: string;
  sku: string;
  units: number;
  selling_price: string; // string rupees
};

export type NimbusOrderInput = {
  order_number: string;        // Our internal ref e.g. "ORD-ABC123"
  payment_mode: "COD" | "PREPAID";
  total_amount: string;        // Amount courier collects at door (string rupees)
  consignee: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  /** Packed dimensions — largest item's box for single-item orders; merged parcel for multi-item. */
  package_weight: number;   // kg (decimal allowed)
  package_length: number;   // cm
  package_breadth: number;  // cm
  package_height: number;   // cm
  order_items: NimbusOrderItem[];
  pickup_location?: string; // Must match a registered address in your NimbusPost panel
};

export type NimbusCreateResult =
  | { ok: true; nimbusOrderId: string }
  | { ok: false; error: string };

/**
 * Creates an order in NimbusPost (WITHOUT courier booking).
 * Returns the NimbusPost order_id on success.
 *
 * Non-throwing — returns { ok: false } so a NimbusPost outage never blocks customer checkout.
 */
export async function createNimbusOrder(
  input: NimbusOrderInput,
): Promise<NimbusCreateResult> {
  const apiKey = process.env.NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("[NimbusPost] Missing API credentials in environment variables");
    return { ok: false, error: "Missing NimbusPost credentials" };
  }

  const cleanPhone = input.consignee.phone.replace(/\D/g, "");
  const numericPhone = cleanPhone ? Number(cleanPhone) : 0;
  const numericPincode = Number(input.consignee.pincode.replace(/\D/g, "")) || 0;
  const collectableAmount = Math.round(Number(input.total_amount));

  const orderItems = input.order_items.map((it) => ({
    name: it.name,
    qty: it.units,
    price: Math.round(Number(it.selling_price)),
    sku: it.sku || "SKU-ITEM",
  }));

  // NimbusPost validation rule:
  // "Collectable amount cannot be greater than order total"
  // For COD orders, our total includes COD handling fee, so ensure items total matches collectable amount.
  const itemsTotal = orderItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  const diff = collectableAmount - itemsTotal;
  if (diff > 0) {
    orderItems.push({
      name: "COD Handling Fee",
      qty: 1,
      price: diff,
      sku: "COD-FEE",
    });
  }

  // NimbusPost v2 CreateOrderRequest schema:
  // - order_type: "b2c"
  // - payment_mode: "cod" | "prepaid" (lowercase)
  // - order_collectable_amount: number (rupees)
  // - shipping_address: { name, phone, address, city, state, pincode (number), country }
  // - items: array of { name, qty, price, sku }
  // - package: { weight, length, width, height }
  const payload: Record<string, unknown> = {
    order_number: input.order_number,
    order_type: "b2c",
    payment_mode: input.payment_mode.toLowerCase() === "cod" ? "cod" : "prepaid",
    order_collectable_amount: collectableAmount,
    shipping_address: {
      name: input.consignee.name,
      phone: numericPhone,
      address: input.consignee.address,
      city: input.consignee.city,
      state: input.consignee.state,
      pincode: numericPincode,
      country: "India",
    },
    items: orderItems,
    package: {
      weight: Math.max(0.01, input.package_weight),
      length: Math.max(1, input.package_length),
      width: Math.max(1, input.package_breadth),
      height: Math.max(1, input.package_height),
    },
  };

  // Pickup warehouse ID from NimbusPost panel (Settings > Warehouses / Pickup Addresses)
  // Note: Do not send dummy "Alwar" string as NimbusPost returns 404 for non-existent warehouse IDs.
  const warehouseId = process.env.NIMBUS_WAREHOUSE_ID || input.pickup_location;
  if (warehouseId && warehouseId !== "Alwar") {
    payload.warehouse_id = warehouseId;
  }

  try {
    const res = await fetch(NIMBUS_ORDERS_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000), // 10s timeout
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errMsg =
        json?.error?.detail ??
        json?.message ??
        (typeof json?.error === "string" ? json.error : JSON.stringify(json?.error)) ??
        `HTTP ${res.status}`;
      console.error("[NimbusPost] createOrder failed:", errMsg, JSON.stringify(json));
      return { ok: false, error: String(errMsg) };
    }
    // NimbusPost returns order_id in data.order_id
    const nimbusOrderId = String(json?.data?.order_id ?? json?.data?.id ?? "");
    console.log("NIMBUS POST ORDER CREATED SUCCESSFULLY WITH ORDER ID", nimbusOrderId);
    if (!nimbusOrderId) {
      console.error("[NimbusPost] createOrder: no order_id in response", json);
      return { ok: false, error: "No order_id returned" };
    }

    console.log(`[NimbusPost] Order created: ${nimbusOrderId} for ${input.order_number}`);
    return { ok: true, nimbusOrderId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NimbusPost] createOrder exception:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Computes the merged parcel dimensions for a multi-item order.
 *
 * Strategy: Largest bounding box that could contain all items stacked.
 * - Weight: sum of all items' physical weights
 * - Length, Breadth: max across all items
 * - Height: sum of all items' heights (stacking model)
 *
 * This is a conservative estimate — real packing may be more compact.
 */
export function mergeParcelDimensions(
  items: {
    qty: number;
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  }[],
): { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number } {
  let totalWeightG = 0;
  let maxLength = 1;
  let maxBreadth = 1;
  let totalHeight = 0;

  for (const item of items) {
    totalWeightG += item.weightG * item.qty;
    maxLength = Math.max(maxLength, item.lengthCm);
    maxBreadth = Math.max(maxBreadth, item.widthCm);
    totalHeight += item.heightCm * item.qty;
  }

  return {
    weightKg: Math.max(0.01, Math.round((totalWeightG / 1000) * 100) / 100),
    lengthCm: Math.max(1, maxLength),
    breadthCm: Math.max(1, maxBreadth),
    heightCm: Math.max(1, totalHeight),
  };
}

// ---------------------------------------------------------------------------
// Courier Booking & Dispatch (POST /v2/shipments/book & POST /v2/shipments/pickup)
// ---------------------------------------------------------------------------

export type NimbusBookResult =
  | {
      ok: true;
      awb: string;
      courierName: string;
      trackingUrl?: string;
      labelUrl?: string;
    }
  | { ok: false; error: string };

/**
 * Books courier for an existing NimbusPost order.
 * If courierId is omitted, NimbusPost auto-allocates the top-ranked serviceable courier.
 */
export async function bookNimbusShipment(
  nimbusOrderId: string,
  courierId?: string,
): Promise<NimbusBookResult> {
  const apiKey = process.env.NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "Missing NimbusPost credentials" };
  }

  const payload: Record<string, unknown> = {
    order_id: nimbusOrderId,
  };
  if (courierId) payload.courier_id = courierId;

  try {
    const res = await fetch("https://api-v2.nimbuspost.com/v2/shipments/book", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const errMsg =
        json?.error?.detail ??
        json?.message ??
        (typeof json?.error === "string" ? json.error : JSON.stringify(json?.error)) ??
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg) };
    }

    return {
      ok: true,
      awb: String(json.data?.awb ?? ""),
      courierName: String(json.data?.courier_name ?? "Courier Partner"),
      trackingUrl: json.data?.tracking_url || json.data?.tracking_short_url || "",
      labelUrl: json.data?.label_url || "",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Asks courier to pick up the shipment from the warehouse / address.
 * pickupDate defaults to the next working day if omitted (YYYY-MM-DD format).
 */
export async function scheduleNimbusPickup(
  nimbusOrderId: string,
  pickupDate?: string,
): Promise<{ ok: true; scheduled: boolean; message?: string } | { ok: false; error: string }> {
  const apiKey = process.env.NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "Missing NimbusPost credentials" };
  }

  const payload: Record<string, unknown> = {
    order_id: nimbusOrderId,
  };
  if (pickupDate) payload.pickup_date = pickupDate;

  try {
    const res = await fetch("https://api-v2.nimbuspost.com/v2/shipments/pickup", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const errMsg =
        json?.error?.detail ??
        json?.message ??
        (typeof json?.error === "string" ? json.error : JSON.stringify(json?.error)) ??
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg) };
    }

    return {
      ok: true,
      scheduled: json.data?.courier_scheduled !== false,
      message: json.data?.message || "Pickup scheduled successfully",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generates and fetches printable PDF shipping label for a booked order.
 */
export async function getNimbusShippingLabels(
  nimbusOrderId: string,
): Promise<{ ok: true; labelUrl: string } | { ok: false; error: string }> {
  const apiKey = process.env.NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "Missing NimbusPost credentials" };
  }

  try {
    const res = await fetch("https://api-v2.nimbuspost.com/v2/shipments/labels", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_id: nimbusOrderId }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const errMsg =
        json?.error?.detail ??
        json?.message ??
        (typeof json?.error === "string" ? json.error : JSON.stringify(json?.error)) ??
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg) };
    }

    return {
      ok: true,
      labelUrl: String(json.data?.url ?? ""),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Real-time Tracking (GET /v2/tracking/order/{orderId})
// ---------------------------------------------------------------------------

export type NimbusTrackingScan = {
  timestamp: string;
  status: string;
  location: string;
  remark?: string;
};

export type NimbusTrackingData = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  awb?: string;
  courierName?: string;
  trackingUrl?: string;
  scans: NimbusTrackingScan[];
  latest?: {
    shipStatus?: string;
    statusCode?: string;
    location?: string;
    message?: string;
    eventTime?: string;
  };
};

export async function trackNimbusOrder(
  nimbusOrderId: string,
): Promise<
  | { ok: true; data: NimbusTrackingData }
  | { ok: false; notBooked?: boolean; error: string }
> {
  const apiKey = process.env.NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { ok: false, error: "Missing NimbusPost credentials" };
  }

  try {
    const res = await fetch(
      `https://api-v2.nimbuspost.com/v2/tracking/order/${encodeURIComponent(nimbusOrderId)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "x-api-secret": apiSecret,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const json = await res.json().catch(() => null);

    // When order is created in NimbusPost but not yet booked to a courier:
    if (res.status === 404 && json?.error?.details?.code === "NO_SHIPMENT") {
      return {
        ok: false,
        notBooked: true,
        error: "Order confirmed. Courier assignment in progress.",
      };
    }

    if (!res.ok || !json?.success) {
      const errMsg =
        json?.error?.detail ??
        json?.message ??
        (typeof json?.error === "string" ? json.error : JSON.stringify(json?.error)) ??
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg) };
    }

    const d = json.data;
    const scansList = Array.isArray(d?.scans) ? d.scans : [];

    return {
      ok: true,
      data: {
        orderId: String(d?.orderId ?? nimbusOrderId),
        orderNumber: String(d?.orderNumber ?? ""),
        orderStatus: String(d?.orderStatus ?? ""),
        awb: d?.awb ? String(d.awb) : undefined,
        courierName: d?.courierName ? String(d.courierName) : undefined,
        trackingUrl: d?.tracking_url || d?.tracking_short_url || "",
        scans: scansList.map((s: Record<string, unknown>) => ({
          timestamp: String(s.timestamp || s.date || ""),
          status: String(s.status || ""),
          location: String(s.location || ""),
          remark: String(s.remark || s.message || ""),
        })),
        latest: d?.latest
          ? {
              shipStatus: String(d.latest.shipStatus || ""),
              statusCode: String(d.latest.statusCode || ""),
              location: String(d.latest.location || ""),
              message: String(d.latest.message || ""),
              eventTime: String(d.latest.eventTime || ""),
            }
          : undefined,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Webhook Signature Verification & Status Mapping
// ---------------------------------------------------------------------------

/**
 * Validates HMAC-SHA256 signature from NimbusPost webhook delivery.
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyNimbusWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret?: string,
): boolean {
  const webhookSecret = secret || process.env.NIMBUS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[NimbusPost] NIMBUS_WEBHOOK_SECRET not set; rejecting or allowing dev only");
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  try {
    return (
      signatureHeader.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}

/**
 * Maps NimbusPost lifecycle statuses to Bachatnix Prisma OrderStatus enum.
 */
export function mapNimbusStatusToOrderStatus(nimbusStatus: string): OrderStatus | null {
  const s = nimbusStatus.toLowerCase().trim();
  switch (s) {
    case "created":
      return "PLACED";
    case "booked":
    case "pickup_scheduled":
    case "pickup_rescheduled":
    case "pickup_pending":
    case "out_for_pickup":
      return "CONFIRMED";
    case "pickup_completed":
    case "in_transit":
    case "reached_at_destination":
    case "out_for_delivery":
      return "SHIPPED";
    case "delivered":
      return "DELIVERED";
    case "cancelled":
    case "rto_delivered":
    case "lost":
    case "damaged":
      return "CANCELLED";
    default:
      return null;
  }
}

