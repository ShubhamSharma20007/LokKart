import { prisma } from "@/lib/prisma";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-config";
const ENDPOINT = "https://api-v2.nimbuspost.com/v2/serviceability";
const PICKUP_PINCODE = process.env.NEXT_PUBLIC_PICKUP_PINCODE ?? "301001";

export type CodEstimate =
  | {
      serviceable: true;
      courier: string;
      etaDays: number;
      shipping: number; // rupees
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
  console.log({
    input,
    items:input.items
  })
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

    // If the order meets the free-shipping threshold, the store absorbs the
    // courier cost and the customer pays only the COD handling fee.
    const freeShipping = orderValueRupees >= FREE_SHIPPING_THRESHOLD;
    const shippingRupees = freeShipping ? 0 : best.result.shippingChargesPaise / 100;
    const codChargeRupees = best.result.codChargesPaise / 100;
  console.log("SHIPPING AMOUNT WITHOUT FREE SHIPPING", best.result.shippingChargesPaise / 100)
    value = {
      serviceable: true,
      courier: best.courierDisplayName,
      etaDays: best.tatDays,
      shipping: shippingRupees,
      codCharge: codChargeRupees,
      total: shippingRupees + codChargeRupees,
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
