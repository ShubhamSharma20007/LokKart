const ENDPOINT = "https://api-v2.nimbuspost.com/v2/serviceability";
const PICKUP_PINCODE = process.env.NEXT_PUBLIC_PICKUP_PINCODE ?? "301001";

// Default parcel per unit. Change to your real product weight/size.
const UNIT_WEIGHT_G = 300;
const PARCEL = { length: 25, width: 20, height: 5 };

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

export async function getCodEstimate(input: {
  deliveryPincode: string;
  orderValueRupees: number;
  qty: number;
}): Promise<CodEstimate> {
  const { deliveryPincode, orderValueRupees } = input;
  const qty = Math.min(Math.max(1, Math.floor(input.qty)), 50);
  const orderValuePaise = Math.round(orderValueRupees * 100);

  const key = `${deliveryPincode}|${orderValuePaise}|${qty}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const apiKey =
    process.env.NEXT_PUBLIC_NIMBUS_API_KEY ||
    process.env.NIMBUS_API_KEY ||
    process.env.NEXT_PUBLIC_NIMBUSPORT_API_KEY;
  const apiSecret =
    process.env.NEXT_PUBLIC_NIMBUS_API_SECRET ||
    process.env.NIMBUS_API_SECRET ||
    process.env.NEXT_PUBLIC_NIMBUSPORT_API_SECRET;

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
      packages: [{ weight: UNIT_WEIGHT_G * qty, ...PARCEL }],
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
    value = {
      serviceable: true,
      courier: best.courierDisplayName,
      etaDays: best.tatDays,
      shipping: best.result.shippingChargesPaise / 100,
      codCharge: best.result.codChargesPaise / 100,
      total: best.result.totalPaise / 100,
    };
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}