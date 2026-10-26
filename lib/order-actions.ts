"use server";

import { prisma } from "@/lib/prisma";
import { getCodEstimate } from "@/lib/shipping";
import { verifyFirebaseToken } from "@/lib/firebase-token";

type Input = {
  token: string;
  payment: "COD" | "UPI";
  address: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
  items: { id: string; qty: number }[];
};

type Result =
  | { ok: true; orderId: string }
  | { ok: false; message: string; errors?: Record<string, string> };

export async function placeOrder(input: Input): Promise<Result> {
  // 1. Who is ordering
  const decoded = await verifyFirebaseToken(input.token).catch(() => null);
  if (!decoded || !decoded.email) return { ok: false, message: "Please sign in again." };

  const user = await prisma.user.findUnique({ where: { email: decoded.email } });
  if (!user) return { ok: false, message: "Account not found." };

  // 2. Validate address
  const a = input.address;
  if (!/^[1-9]\d{5}$/.test(a.pincode)) return { ok: false, message: "Invalid pincode.", errors: { pincode: "Invalid pincode" } };
  if (!/^[6-9]\d{9}$/.test(a.phone)) return { ok: false, message: "Invalid phone.", errors: { phone: "Invalid phone" } };
  if (!a.name.trim() || !a.address.trim() || !a.city.trim() || !a.state.trim()) {
    return { ok: false, message: "Please fill in the full address." };
  }

  // 3. Prices and stock come from the DB, never from the browser
  const wanted = input.items.filter((i) => i.qty > 0 && Number.isInteger(i.qty));
  if (wanted.length === 0) return { ok: false, message: "Your cart is empty." };

  const products = await prisma.product.findMany({
    where: { id: { in: wanted.map((i) => i.id) } },
    select: { id: true, title: true, price: true, stock: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let qty = 0;
  const lines: { productId: string; title: string; price: number; qty: number }[] = [];

  for (const i of wanted) {
    const p = byId.get(i.id);
    if (!p) return { ok: false, message: "A product in your cart is no longer available." };
    if (p.stock < i.qty) return { ok: false, message: `Only ${p.stock} left for "${p.title}".` };
    subtotal += p.price * i.qty;
    qty += i.qty;
    lines.push({ productId: p.id, title: p.title, price: p.price, qty: i.qty });
  }

  // 4. COD charges, recalculated on the server
  let shipping = 0;
  let codCharge = 0;
  if (input.payment === "COD") {
    try {
      const est = await getCodEstimate({ deliveryPincode: a.pincode, orderValueRupees: subtotal, qty });
      if (!est.serviceable) return { ok: false, message: "COD is not available for this pincode." };
      shipping = est.shipping;
      codCharge = est.codCharge;
    } catch {
      return { ok: false, message: "Could not calculate COD charges. Please try again." };
    }
  }

  const total = subtotal + shipping + codCharge;

  // 5. Create order and reduce stock together
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
          userId: user.id,
          paymentMethod: input.payment,
          status: "PLACED",
          subtotal,
          shipping,
          codCharge,
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

    return { ok: true, orderId: order.id };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("STOCK:")) {
      return { ok: false, message: `"${e.message.slice(6)}" just went out of stock.` };
    }
    console.error("placeOrder failed", e);
    return { ok: false, message: "Could not place your order. Please try again." };
  }
}

