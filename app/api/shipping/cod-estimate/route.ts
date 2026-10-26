import { NextResponse } from "next/server";
import { getCodEstimate, isValidPincode } from "@/lib/shipping";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const pincode = body?.pincode;
  const orderValue = Number(body?.orderValue);
  const qty = Number(body?.qty ?? 1);

  if (!isValidPincode(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  }
  if (!Number.isFinite(orderValue) || orderValue <= 0) {
    return NextResponse.json({ error: "Invalid order value" }, { status: 400 });
  }

  try {
    const estimate = await getCodEstimate({
      deliveryPincode: pincode,
      orderValueRupees: orderValue,
      qty: Number.isFinite(qty) ? qty : 1,
    });
    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json({ error: "Could not get shipping rates" }, { status: 502 });
  }
}