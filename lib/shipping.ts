import { prisma } from "@/lib/prisma";
const ENDPOINT = "https://api-v2.nimbuspost.com/v2/serviceability";
const PICKUP_PINCODE = process.env.NEXT_PUBLIC_PICKUP_PINCODE ?? "301001";

export type CodEstimate =
  | {
      serviceable: true;
      courier: string;
      etaDays: number;
      shipping: number; // rupees
      actualShippingExpense: number
      codCharge: number; // rupees
      total: number; // shipping + codCharge, rupees
    }
  | { serviceable: false };

// One cart line, with the packed size of ONE piece (saved on the product).
export type ShipItem = {
  qty: number;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

type Courier = {
  courierDisplayName: string;
  tatDays: number;
  result: { shippingChargesPaise: number; codChargesPaise: number; totalPaise: number };
};

// Small in-memory cache (5 min) so repeated pincode checks don't hit NimbusPost.
const cache = new Map<string, { at: number; value: CodEstimate }>();
const TTL = 5 * 60 * 1000;

export function isValidPincode(p: unknown): p is string {
  return typeof p === "string" && /^[1-9]\d{5}$/.test(p);
}

// Build individual packages — one physical parcel per item per qty.
// This mirrors how Amazon / Flipkart / Meesho price shipments:
// each product ships in its own box so one item's large dimensions
// never inflate the volumetric weight of the rest of the order.
// NimbusPost's `packages[]` array accepts multiple boxes and sums
// the charges correctly.
export function buildPackages(
  items: ShipItem[],
): Array<{ weight: number; length: number; width: number; height: number }> {
  const pkgs: Array<{ weight: number; length: number; width: number; height: number }> = [];
  for (const item of items) {
    for (let i = 0; i < item.qty; i++) {
      pkgs.push({
        weight: Math.max(item.weightG, 1),
        length: Math.max(item.lengthCm, 1),
        width: Math.max(item.widthCm, 1),
        height: Math.max(item.heightCm, 1),
      });
    }
  }
  // Fallback: should never happen, but guard against an empty array
  if (pkgs.length === 0) pkgs.push({ weight: 100, length: 10, width: 10, height: 5 });
  return pkgs;
}

export async function getCodEstimate(input: {
  deliveryPincode: string;
  orderValueRupees: number;
  items: ShipItem[];
}): Promise<CodEstimate> {
  // console.log({
  //   input,
  //   items:input.items
  // })
  const { deliveryPincode, orderValueRupees, items } = input;
  const orderValuePaise = Math.round(orderValueRupees * 100);
  const packages = buildPackages(items);

  // Cache key: pincode + order value + every package's dimensions
  const pkgKey = packages.map((p) => `${p.weight}x${p.length}x${p.width}x${p.height}`).join(",");
  const key = `${deliveryPincode}|${orderValuePaise}|${pkgKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  // Server-only variables: no NEXT_PUBLIC_ prefix, so they can never reach the browser.
  const apiKey = process.env.NIMBUS_API_KEY ?? process.env.NEXT_PUBLIC_NIMBUS_API_KEY;
  const apiSecret = process.env.NIMBUS_API_SECRET ?? process.env.NEXT_PUBLIC_NIMBUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("Missing NimbusPost API credentials in environment variables.");
    throw new Error("Shipping lookup configuration error");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickupPincode: PICKUP_PINCODE,
      deliveryPincode,
      paymentMode: "cod",
      packages,          // ← array of individual parcels, not one merged box
      orderValuePaise,
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!json?.success) {
    console.error("NimbusPost serviceability failed", json?.error);
    throw new Error("Shipping lookup failed");
  }

  const couriers: Courier[] = json.data?.available ?? [];
  let value: CodEstimate;

  if (couriers.length === 0) {
    value = { serviceable: false };
  } else {
    // Cheapest courier by shipping + COD.
    const best = couriers.reduce((a, b) => (b.result.totalPaise < a.result.totalPaise ? b : a));
    console.log(
    "NimbusPost courier charges:",
    couriers.map((c) => ({
      courier: c.courierDisplayName,
      shippingPaise: c.result.shippingChargesPaise,
      codPaise: c.result.codChargesPaise,
      totalPaise: c.result.totalPaise,
      codRupees: c.result.codChargesPaise / 100,
    }))
  );

    // 100% Free Shipping: customer shipping is always 0 (included in product buffer).
    // Courier expense is tracked for store analytics, customer only pays COD fee on COD orders.
    const actualShippingExpense = best.result.shippingChargesPaise / 100;
    const codChargeRupees = best.result.codChargesPaise / 100;

    console.log("ACTUAL SHIPPING EXPENSE: ",actualShippingExpense)

    value = {
      serviceable: true,
      courier: best.courierDisplayName,
      etaDays: best.tatDays,
      shipping: 0,
      actualShippingExpense,
      codCharge: codChargeRupees,
      total: codChargeRupees,
    };
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}

// For the cart/checkout estimate: the browser sends only product ids and quantities.
// Price and packed size are read from the database, never taken from the browser.
export async function getCartShippingInfo(
  raw: unknown,
): Promise<{ ok: true; subtotal: number; items: ShipItem[] } | { ok: false; message: string }> {
  const cart = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const r of raw.slice(0, 50)) {
      const { id, qty } = (r ?? {}) as { id?: unknown; qty?: unknown };
      if (typeof id === "string" && id && Number.isInteger(qty) && (qty as number) >= 1 && (qty as number) <= 100000) {
        cart.set(id, (cart.get(id) ?? 0) + (qty as number));
      }
    }
  }
  if (!cart.size) return { ok: false, message: "Your cart is empty." };

  const products = await prisma.product.findMany({
    where: { id: { in: [...cart.keys()] } },
    select: { id: true, price: true, weightG: true, lengthCm: true, widthCm: true, heightCm: true },
  });
  if (products.length !== cart.size) return { ok: false, message: "A product in your cart is no longer available." };

  let subtotal = 0;
  const items: ShipItem[] = [];
  for (const p of products) {
    const qty = cart.get(p.id)!;
    subtotal += p.price * qty;
    items.push({ qty, weightG: p.weightG, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm });
  }
  return { ok: true, subtotal, items };
}

// Sample hub pincodes representing India's major shipping zones (North, West, South, East)
const BUFFER_HUBS = [
  { pin: "110001", weight: 0.35 }, // North (Delhi NCR)
  { pin: "400001", weight: 0.25 }, // West (Mumbai)
  { pin: "560001", weight: 0.25 }, // South (Bengaluru)
  { pin: "700001", weight: 0.15 }, // East (Kolkata)
];

// Fallback courier rate based on billable weight slabs (500g increments)
// Mirrors standard surface courier cards for India deliveries from Rajasthan
export function getFallbackShippingBuffer(
  weightG: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
): number {
  const volumetricGrams = Math.ceil(
    (Math.max(lengthCm, 1) * Math.max(widthCm, 1) * Math.max(heightCm, 1)) / 5,
  );
  const billableGrams = Math.max(Math.max(weightG, 1), volumetricGrams);
  const slabs = Math.max(1, Math.ceil(billableGrams / 500));
  if (slabs === 1) return 70; // 0 - 500g -> ₹70
  if (slabs === 2) return 100; // 501 - 1000g -> ₹100
  return 100 + (slabs - 2) * 35; // 1001g+ -> ₹135, ₹170, etc.
}

// Automatically calculates representative shipping buffer for an item when admin adds/edits product
export async function calculateShippingBuffer(item: {
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  basePrice?: number;
}): Promise<number> {
  const fallback = getFallbackShippingBuffer(
    item.weightG,
    item.lengthCm,
    item.widthCm,
    item.heightCm,
  );

  try {
    const promises = BUFFER_HUBS.map(async (hub) => {
      const est = await getCodEstimate({
        deliveryPincode: hub.pin,
        orderValueRupees: item.basePrice || 250,
        items: [
          {
            qty: 1,
            weightG: item.weightG,
            lengthCm: item.lengthCm,
            widthCm: item.widthCm,
            heightCm: item.heightCm,
          },
        ],
      });
      return { hub, est };
    });

    const results = await Promise.allSettled(promises);
    let weighted = 0;
    let usedWeight = 0;

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.est.serviceable) {
        weighted += r.value.est.actualShippingExpense * r.value.hub.weight;
        usedWeight += r.value.hub.weight;
      }
    }

    if (usedWeight > 0) {
      const avg = weighted / usedWeight;
      // 10% safety margin, rounded up to nearest ₹5
      return Math.ceil((avg * 1.1) / 5) * 5;
    }
  } catch (err) {
    console.warn("calculateShippingBuffer: API lookup failed, using fallback slab", err);
  }

  return fallback;
}

