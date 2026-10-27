import { NextResponse } from "next/server";
import { getCartShippingInfo, getCodEstimate, isValidPincode } from "@/lib/shipping";

// POST /api/shipping/cod-estimate  { pincode, items: [{ id, qty }] }
// -> { serviceable: true, courier, etaDays, shipping, codCharge, total } | { serviceable: false }
export async function POST(req: Request) {
  let body: { pincode?: unknown; items?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {}

  if (!isValidPincode(body?.pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  }

  try {
    const cart = await getCartShippingInfo(body?.items);
    if (!cart.ok) return NextResponse.json({ error: cart.message }, { status: 400 });

    const estimate = await getCodEstimate({
      deliveryPincode: body.pincode,
      orderValueRupees: cart.subtotal,
      items: cart.items,
    });
    return NextResponse.json(estimate, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("cod-estimate failed", err);
    return NextResponse.json({ error: "Could not check delivery right now. Please try again." }, { status: 502 });
  }
}