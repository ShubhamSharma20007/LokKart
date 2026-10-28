/**
 * NimbusPost v2 API Integration — Order creation only.
 *
 * Strategy:
 *   POST /v2/orders   → Registers the order in NimbusPost WITHOUT booking a courier.
 *                       No one comes to your door to pick up anything.
 *                       You (admin) can later book / dispatch from NimbusPost dashboard.
 *
 * Why NOT POST /v2/shipments?
 *   /v2/shipments creates an order AND immediately books a courier,
 *   which would trigger a pickup request to come to your warehouse.
 *   We don't want that — courier booking is done manually by admin after verifying the order.
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

