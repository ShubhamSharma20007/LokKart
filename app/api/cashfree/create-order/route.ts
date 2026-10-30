import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";
import { createCashfreeOrder } from "@/lib/cashfree";
import type { ShipItem } from "@/lib/shipping";

const makeRef = () => `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      address?: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
      };
      items?: { id: string; qty: number }[];
    };

    const { token, address: a, items: rawItems } = body;

    // 1. Auth
    if (!token) {
      return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = await verifyFirebaseToken(token).catch(() => null);
    if (!decoded?.email) {
      return NextResponse.json({ ok: false, message: "Please sign in again." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) {
      return NextResponse.json({ ok: false, message: "Account not found." }, { status: 404 });
    }

    // 2. Validate address
    if (!a) {
      return NextResponse.json({ ok: false, message: "Address is required." }, { status: 400 });
    }
    if (!/^[1-9]\d{5}$/.test(a.pincode)) {
      return NextResponse.json(
        { ok: false, message: "Invalid pincode.", errors: { pincode: "Invalid pincode" } },
        { status: 400 }
      );
    }
    if (!/^[6-9]\d{9}$/.test(a.phone)) {
      return NextResponse.json(
        { ok: false, message: "Invalid phone.", errors: { phone: "Invalid phone" } },
        { status: 400 }
      );
    }
    if (!a.name.trim() || !a.address.trim() || !a.city.trim() || !a.state.trim()) {
      return NextResponse.json({ ok: false, message: "Please fill in the full address." }, { status: 400 });
    }

    // 3. Validate items — prices always from DB
    const wanted = (rawItems ?? []).filter((i) => i.qty > 0 && Number.isInteger(i.qty));
    if (wanted.length === 0) {
      return NextResponse.json({ ok: false, message: "Your cart is empty." }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: wanted.map((i) => i.id) } },
      select: {
        id: true,
        title: true,
        price: true,
        stock: true,
        weightG: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lines: { productId: string; title: string; price: number; qty: number }[] = [];

    for (const i of wanted) {
      const p = byId.get(i.id);
      if (!p) {
        return NextResponse.json(
          { ok: false, message: "A product in your cart is no longer available." },
          { status: 400 }
        );
      }
      if (p.stock < i.qty) {
        return NextResponse.json(
          { ok: false, message: `Only ${p.stock} left for "${p.title}".` },
          { status: 400 }
        );
      }
      subtotal += p.price * i.qty;
      lines.push({ productId: p.id, title: p.title, price: p.price, qty: i.qty });
    }

    const total = subtotal; // UPI: no COD charge, free shipping
    const orderRef = makeRef();

    // 4. Create order in DB + deduct stock in a transaction
    let orderId: string;
    try {
      const order = await prisma.$transaction(async (tx) => {
        for (const l of lines) {
          const r = await tx.product.updateMany({
            where: { id: l.productId, stock: { gte: l.qty } },
            data: { stock: { decrement: l.qty } },
          });
          if (r.count === 0) throw new Error(`STOCK:${l.title}`);
        }

        return tx.order.create({
          data: {
            ref: orderRef,
            userId: user.id,
            paymentMethod: "UPI",
            paymentStatus: "PENDING",
            status: "PLACED",
            subtotal,
            shipping: 0,
            codCharge: 0,
            total,
            name: a.name.trim(),
            phone: a.phone,
            address: a.address.trim(),
            city: a.city.trim(),
            state: a.state.trim(),
            pincode: a.pincode,
            items: { create: lines },
          },
          select: { id: true },
        });
      });
      orderId = order.id;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("STOCK:")) {
        return NextResponse.json(
          { ok: false, message: `"${e.message.slice(6)}" just went out of stock.` },
          { status: 409 }
        );
      }
      console.error("[Cashfree createOrder] DB transaction failed:", e);
      return NextResponse.json(
        { ok: false, message: "Could not create order. Please try again." },
        { status: 500 }
      );
    }

    // 5. Create Cashfree order
    let origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      req.headers.get("origin") ||
      "https://bachatnix.vercel.app";

    // Cashfree strictly enforces HTTPS for return_url.
    // http://localhost is rejected by Cashfree's API validator.
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      origin = "https://bachatnix.vercel.app";
    } else if (origin.startsWith("http://")) {
      origin = origin.replace("http://", "https://");
    }

    const returnUrl = `${origin.replace(/\/$/, "")}/orders/payment-result?orderId=${orderRef}`;
    const cfResult = await createCashfreeOrder({
      orderId: orderRef,
      amount: total,
      customerName: a.name.trim(),
      customerEmail: decoded.email,
      customerPhone: a.phone,
      returnUrl,
    });

    if (!cfResult.ok) {
      // Rollback: delete order + restore stock
      try {
        await prisma.$transaction(async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId } });
          for (const l of lines) {
            await tx.product.update({
              where: { id: l.productId },
              data: { stock: { increment: l.qty } },
            });
          }
          await tx.order.delete({ where: { id: orderId } });
        });
      } catch (rollbackErr) {
        console.error("[Cashfree createOrder] Rollback failed:", rollbackErr);
      }
      return NextResponse.json(
        { ok: false, message: `Payment gateway error: ${cfResult.error}` },
        { status: 502 }
      );
    }

    // 6. Save cashfreeOrderId to the DB order
    await prisma.order.update({
      where: { id: orderId },
      data: { cashfreeOrderId: cfResult.cfOrderId },
    });

    return NextResponse.json({
      ok: true,
      paymentSessionId: cfResult.paymentSessionId,
      cfOrderId: cfResult.cfOrderId,
      paymentMode: cfResult.paymentMode,
      orderId,
      orderRef,
    });
  } catch (err) {
    console.error("[Cashfree createOrder] Unhandled error:", err);
    return NextResponse.json({ ok: false, message: "Internal server error." }, { status: 500 });
  }
}
