"use server";

import { getProduct } from "@/lib/products";
import { validate, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { deleteImageKitFile, requireAdmin } from "../lib/imagekit-server"

const makeRef = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const fail = (s: FormState, message = "Fix the highlighted fields and try again."): FormState => ({ ...s, ok: false, message });

// Admin: add a product. Saves the ImageKit url and fileId so the image can be deleted later.
export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = validate(fd, {
    title: { label: "Title", required: true },
    category: { label: "Category", required: true },
    description: { label: "Description", required: true },
    imageUrl: { label: "Image" },
    imageUrlFileId: { label: "Image id" },
    price: { label: "Price", required: true, positive: true },
    mrp: { label: "MRP", required: true, positive: true },
    stock: { label: "Stock", required: true, positive: true },
  });
  if (Number(s.values.price) >= Number(s.values.mrp)) s.errors.price ||= "Price must be below MRP";
  for (const k of ["price", "mrp", "stock"]) {
    if (!s.errors[k] && !Number.isInteger(Number(s.values[k]))) s.errors[k] = "Enter a whole number";
  }

  // Only accept images that were uploaded to our own ImageKit account.
  const { imageUrl, imageUrlFileId: fileId } = s.values;
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (imageUrl) {
    if (!endpoint || !imageUrl.startsWith(`${endpoint}/`) || !/^[A-Za-z0-9_-]{10,64}$/.test(fileId)) {
      s.errors.imageUrl = "Upload the image again";
    }
  }
  if (Object.keys(s.errors).length) return fail(s);

  try {
    await requireAdmin(String(fd.get("token") ?? ""));
  } catch {
    return fail(s, "Only admins can add products.");
  }

  try {
    const product = await prisma.product.create({
      data: {
        title: s.values.title,
        description: s.values.description,
        category: s.values.category,
        price: Number(s.values.price),
        mrp: Number(s.values.mrp),
        stock: Number(s.values.stock),
        imageUrl: imageUrl || null,
        imageFileId: imageUrl ? fileId : null,
      },
      select: { id: true },
    });
    return { ...s, ok: true, ref: product.id };
  } catch (err) {
    console.error("createProduct failed", err);
    // Don't leave an orphaned upload behind if the product was not saved.
    if (imageUrl) await deleteImageKitFile(fileId);
    return fail(s, "We could not save the product. Please try again.");
  }
}

export type DeleteResult = { ok: true } | { ok: false; message: string };

// Admin: delete a product and its ImageKit image.
export async function deleteProduct(idToken: string, productId: string): Promise<DeleteResult> {
  try {
    await requireAdmin(idToken);
  } catch {
    return { ok: false, message: "Only admins can delete products." };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { imageFileId: true, _count: { select: { orderItems: true } } },
    });
    if (!product) return { ok: false, message: "That product no longer exists." };

    // Order history keeps a reference to the product, so it can't be removed once ordered.
    if (product._count.orderItems > 0) {
      return { ok: false, message: "This product is in past orders. Set its stock to 0 instead of deleting it." };
    }

    await prisma.product.delete({ where: { id: productId } });

    // The row is already gone; a failed image delete is logged but doesn't fail the request.
    if (product.imageFileId) await deleteImageKitFile(product.imageFileId);

    return { ok: true };
  } catch (err) {
    console.error("deleteProduct failed", err);
    return { ok: false, message: "We could not delete the product. Please try again." };
  }
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