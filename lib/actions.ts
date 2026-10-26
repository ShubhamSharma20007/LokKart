"use server";
import { validate, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { deleteImageKitFile, requireAdmin,getUserFromToken } from "../lib/imagekit-server"
import { categories, getProduct } from "@/lib/products";
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

class StockError extends Error {}

// Buyer: place an order. Prices and stock come from the database, never from the browser.
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

  const method = s.values.method;
  if (!["COD", "UPI"].includes(method)) s.errors.method = "Choose a payment method";
  if (method === "UPI" && !/^\d{12}$/.test(s.values.utr)) {
    s.errors.utr = "Enter the 12-digit UTR from your UPI app";
  }
  if (Object.keys(s.errors).length) return fail(s);

  // Orders belong to a signed-in user so they show up under "My orders".
  let user: { id: string } | null = null;
  try {
    user = await getUserFromToken(String(fd.get("token") ?? ""));
  } catch {}
  if (!user) return fail(s, "Please sign in to place your order.");

  // Merge duplicate lines and drop anything malformed.
  const cart = new Map<string, number>();
  try {
    const raw: unknown = JSON.parse(s.values.items);
    if (Array.isArray(raw)) {
      for (const r of raw.slice(0, 50)) {
        const { id, qty } = (r ?? {}) as { id?: unknown; qty?: unknown };
        if (typeof id === "string" && id && Number.isInteger(qty) && (qty as number) >= 1 && (qty as number) <= 100000) {
          cart.set(id, (cart.get(id) ?? 0) + (qty as number));
        }
      }
    }
  } catch {}
  if (!cart.size) return fail(s, "Your cart is empty.");

  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: [...cart.keys()] } },
        select: { id: true, title: true, price: true },
      });
      if (products.length !== cart.size) throw new StockError("An item in your cart is no longer available. Update your cart.");

      let total = 0;
      const items: { productId: string; title: string; qty: number; price: number }[] = [];

      for (const p of products) {
        const qty = cart.get(p.id)!;
        // Only decrements if enough stock is left, so two buyers can't oversell the last piece.
        const res = await tx.product.updateMany({
          where: { id: p.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (res.count === 0) throw new StockError(`${p.title} is no longer available in that quantity. Update your cart.`);
        total += p.price * qty;
        items.push({ productId: p.id, title: p.title, qty, price: p.price });
      }

      return tx.order.create({
        data: {
          ref: makeRef("ORD"),
          userId: user!.id,
          name: s.values.name,
          phone: s.values.phone,
          address: {
            address: s.values.address,
            city: s.values.city,
            state: s.values.state,
            pincode: s.values.pincode,
          },
          total,
          paymentMethod: method as "COD" | "UPI",
          upiTxnId: method === "UPI" ? s.values.utr : null,
          items: { create: items },
        },
        select: { ref: true },
      });
    });

    return { ...s, ok: true, ref: order.ref };
  } catch (err) {
    if (err instanceof StockError) return fail(s, err.message);
    if ((err as { code?: string }).code === "P2002" && method === "UPI") {
      s.errors.utr = "This UTR was already used for another order";
      return fail(s);
    }
    console.error("placeOrder failed", err);
    return fail(s, "We could not place your order. Please try again.");
  }
}

// Admin: edit a product. Swaps the ImageKit image if a new one was uploaded.
export async function updateProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = validate(fd, {
    id: { label: "Product id", required: true },
    title: { label: "Title", required: true },
    category: { label: "Category", required: true },
    description: { label: "Description", required: true },
    imageUrl: { label: "Image" },
    imageUrlFileId: { label: "Image id" },
    price: { label: "Price", required: true, positive: true },
    mrp: { label: "MRP", required: true, positive: true },
    stock: { label: "Stock", required: true, nonNegative: true },
  });
  if (!(categories as readonly string[]).includes(s.values.category)) s.errors.category ||= "Choose a category";
  if (Number(s.values.price) >= Number(s.values.mrp)) s.errors.price ||= "Price must be below MRP";
  for (const k of ["price", "mrp", "stock"]) {
    if (!s.errors[k] && !Number.isInteger(Number(s.values[k]))) s.errors[k] = "Enter a whole number";
  }

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
    return fail(s, "Only admins can edit products.");
  }

  const existing = await prisma.product.findUnique({
    where: { id: s.values.id },
    select: { imageFileId: true },
  });
  if (!existing) return fail(s, "That product no longer exists.");

  const newFileId = imageUrl ? fileId : null;
  const imageChanged = newFileId !== existing.imageFileId;

  try {
    await prisma.product.update({
      where: { id: s.values.id },
      data: {
        title: s.values.title,
        description: s.values.description,
        category: s.values.category,
        price: Number(s.values.price),
        mrp: Number(s.values.mrp),
        stock: Number(s.values.stock),
        imageUrl: imageUrl || null,
        imageFileId: newFileId,
      },
    });
  } catch (err) {
    console.error("updateProduct failed", err);
    // Don't leave the freshly uploaded image orphaned.
    if (imageChanged && newFileId) await deleteImageKitFile(newFileId);
    return fail(s, "We could not save the changes. Please try again.");
  }

  // The row is saved; remove the replaced/cleared image from ImageKit.
  if (imageChanged && existing.imageFileId) await deleteImageKitFile(existing.imageFileId);

  return { ...s, ok: true, ref: s.values.id };
}