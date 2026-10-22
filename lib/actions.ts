"use server";

import { getProduct } from "@/lib/products";
import { validate, type FormState } from "@/lib/forms";

const makeRef = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const fail = (s: FormState, message = "Fix the highlighted fields and try again."): FormState => ({ ...s, ok: false, message });

// Admin: add a product. TODO: check the admin session, then prisma.product.create
export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = validate(fd, {
    title: { label: "Title", required: true },
    category: { label: "Category", required: true },
    description: { label: "Description", required: true },
    price: { label: "Price", required: true, positive: true },
    mrp: { label: "MRP", required: true, positive: true },
    stock: { label: "Stock", required: true, positive: true },
  });
  if (Number(s.values.price) >= Number(s.values.mrp)) s.errors.price ||= "Price must be below MRP";
  if (Object.keys(s.errors).length) return fail(s);

  return { ...s, ok: true, ref: makeRef("PRD") };
}

// Buyer: place an order. Prices come from the server, never from the browser.
export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = validate(fd, {
    name: { label: "Full name", required: true },
    phone: { label: "Mobile number", required: true, phone: true },
    address: { label: "Address", required: true },
    city: { label: "City", required: true },
    state: { label: "State", required: true },
    pincode: { label: "Pincode", required: true, pincode: true },
    method: { label: "Payment method", required: true },
    utr: { label: "UTR" },
    items: { label: "Cart", required: true },
  });

  if (!["COD", "UPI"].includes(s.values.method)) s.errors.method = "Choose a payment method";
  if (s.values.method === "UPI" && !/^\d{12}$/.test(s.values.utr)) {
    s.errors.utr = "Enter the 12-digit UTR from your UPI app";
  }
  if (Object.keys(s.errors).length) return fail(s);

  let cart: { id: string; qty: number }[] = [];
  try {
    cart = JSON.parse(s.values.items);
  } catch {}
  if (!cart.length) return fail(s, "Your cart is empty.");

  let total = 0;
  for (const c of cart) {
    const p = getProduct(c.id);
    if (!p || !(c.qty >= 1) || c.qty > p.stock) {
      return fail(s, `${p?.title ?? "An item"} is no longer available in that quantity. Update your cart.`);
    }
    total += p.price * c.qty;
  }

  // TODO: in one prisma.$transaction, re-check stock, decrement it, create Order + OrderItems
  // paymentMethod = s.values.method, upiTxnId = s.values.utr, paymentStatus = PENDING
  return { ...s, ok: true, ref: makeRef("ORD") };
}