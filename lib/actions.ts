"use server";
import { validate, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { deleteImageKitFile, requireAdmin,getUserFromToken } from "../lib/imagekit-server"
import { categories, getProduct } from "@/lib/products";
import { calculateShippingBuffer } from "@/lib/shipping";
const makeRef = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const fail = (s: FormState, message = "Fix the highlighted fields and try again."): FormState => ({ ...s, ok: false, message });

// Packed size of one piece. The courier prices delivery from these, so they are required.
const SHIPPING_RULES = {
  weightG: { label: "Weight", required: true, positive: true },
  lengthCm: { label: "Length", required: true, positive: true },
  widthCm: { label: "Width", required: true, positive: true },
  heightCm: { label: "Height", required: true, positive: true },
};
const SHIPPING_LIMITS = { weightG: [1, 50000], lengthCm: [1, 200], widthCm: [1, 200], heightCm: [1, 200] } as const;

function checkShipping(s: FormState) {
  for (const [k, [min, max]] of Object.entries(SHIPPING_LIMITS)) {
    if (s.errors[k]) continue;
    const n = Number(s.values[k]);
    if (!Number.isInteger(n) || n < min || n > max) {
      s.errors[k] = k === "weightG" ? `Enter whole grams, ${min} to ${max}` : `Enter whole cm, ${min} to ${max}`;
    }
  }
}

const shippingData = (s: FormState) => ({
  weightG: Number(s.values.weightG),
  lengthCm: Number(s.values.lengthCm),
  widthCm: Number(s.values.widthCm),
  heightCm: Number(s.values.heightCm),
});

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
    ...SHIPPING_RULES,
    
  });
  if (Number(s.values.price) >= Number(s.values.mrp)) s.errors.price ||= "Price must be below MRP";
  for (const k of ["price", "mrp", "stock"]) {
    if (!s.errors[k] && !Number.isInteger(Number(s.values[k]))) s.errors[k] = "Enter a whole number";
  }
  checkShipping(s);

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

  const basePrice = Number(s.values.price);
  const mrp = Number(s.values.mrp);

  // Auto-calculate shipping buffer for 100% Free Shipping store
  const shippingBuffer = await calculateShippingBuffer({
    ...shippingData(s),
    basePrice,
  });

  const finalPrice = basePrice + shippingBuffer;
  if (finalPrice >= mrp) {
    s.errors.mrp = `With auto shipping buffer (₹${shippingBuffer}), final selling price reaches ₹${finalPrice}. Please increase MRP to at least ₹${finalPrice + 1} or lower base price.`;
    return fail(s);
  }

  const imagesJson = String(fd.get("imagesJson") ?? "[]");
  const imageFileIdsJson = String(fd.get("imageFileIdsJson") ?? "[]");
  let images: string[] = [];
  let imageFileIds: string[] = [];
  try {
    images = JSON.parse(imagesJson);
    imageFileIds = JSON.parse(imageFileIdsJson);
  } catch {}

  if (images.length === 0 && s.values.imageUrl) {
    images = [s.values.imageUrl];
    imageFileIds = [s.values.imageUrlFileId || ""];
  }

  const primaryUrl = images[0] || null;
  const primaryFileId = imageFileIds[0] || null;

  try {
    const product = await prisma.product.create({
      data: {
        title: s.values.title,
        description: s.values.description,
        category: s.values.category,
        price: finalPrice,
        mrp: mrp,
        stock: Number(s.values.stock),
        ...shippingData(s),
        imageUrl: primaryUrl,
        imageFileId: primaryFileId,
        images: images,
        imageFileIds: imageFileIds,
        basePrice: basePrice,
        shippingBuffer: shippingBuffer,
      },
      select: { id: true },
    });
    return { ...s, ok: true, ref: product.id };
  } catch (err) {
    console.error("createProduct failed", err);
    // Don't leave orphaned uploads behind if the product was not saved.
    for (const fid of imageFileIds) {
      if (fid) await deleteImageKitFile(fid);
    }
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
      select: { imageFileId: true, imageFileIds: true, _count: { select: { orderItems: true } } },
    });
    if (!product) return { ok: false, message: "That product no longer exists." };

    // Order history keeps a reference to the product, so it can't be removed once ordered.
    if (product._count.orderItems > 0) {
      return { ok: false, message: "This product is in past orders. Set its stock to 0 instead of deleting it." };
    }

    await prisma.product.delete({ where: { id: productId } });

    // Delete all associated images from ImageKit
    const toDelete = new Set<string>();
    if (product.imageFileId) toDelete.add(product.imageFileId);
    for (const fid of product.imageFileIds || []) {
      if (fid) toDelete.add(fid);
    }
    for (const fid of toDelete) {
      await deleteImageKitFile(fid);
    }

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
      address: s.values.address,
      city: s.values.city,
      state: s.values.state,
      pincode: s.values.pincode,
      subtotal: total,
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
    ...SHIPPING_RULES,
  });
  if (!s.values.category?.trim()) s.errors.category ||= "Choose or enter a category";
  if (Number(s.values.price) >= Number(s.values.mrp)) s.errors.price ||= "Price must be below MRP";
  for (const k of ["price", "mrp", "stock"]) {
    if (!s.errors[k] && !Number.isInteger(Number(s.values[k]))) s.errors[k] = "Enter a whole number";
  }
  checkShipping(s);

  try {
    await requireAdmin(String(fd.get("token") ?? ""));
  } catch {
    return fail(s, "Only admins can edit products.");
  }

  const existing = await prisma.product.findUnique({
    where: { id: s.values.id },
    select: { imageFileId: true, imageFileIds: true, shippingBuffer: true, imageUrl: true, images: true },
  });
  if (!existing) return fail(s, "That product no longer exists.");

  const imagesJson = String(fd.get("imagesJson") ?? "[]");
  const imageFileIdsJson = String(fd.get("imageFileIdsJson") ?? "[]");
  let images: string[] = [];
  let imageFileIds: string[] = [];
  try {
    images = JSON.parse(imagesJson);
    imageFileIds = JSON.parse(imageFileIdsJson);
  } catch {}

  // Fallback if imagesJson not provided
  if (images.length === 0 && s.values.imageUrl) {
    images = [s.values.imageUrl];
    imageFileIds = [s.values.imageUrlFileId || ""];
  }

  const primaryUrl = images[0] || null;
  const primaryFileId = imageFileIds[0] || null;

  if (Object.keys(s.errors).length) return fail(s);

  // Compute removed image file IDs so we can delete them from ImageKit
  const oldIds = new Set<string>();
  if (existing.imageFileId) oldIds.add(existing.imageFileId);
  for (const fid of existing.imageFileIds || []) {
    if (fid) oldIds.add(fid);
  }
  const newIds = new Set(imageFileIds);
  const toDelete = Array.from(oldIds).filter((id) => id && !newIds.has(id));

  const basePrice = Number(s.values.price);
  const mrp = Number(s.values.mrp);

  // Auto-calculate shipping buffer based on dimensions/weight
  const shippingBuffer = await calculateShippingBuffer({
    ...shippingData(s),
    basePrice,
  });

  const finalPrice = basePrice + shippingBuffer;
  if (finalPrice >= mrp) {
    s.errors.mrp = `With auto shipping buffer (₹${shippingBuffer}), final selling price reaches ₹${finalPrice}. Please increase MRP to at least ₹${finalPrice + 1} or lower base price.`;
    return fail(s);
  }

  try {
    await prisma.product.update({
      where: { id: s.values.id },
      data: {
        title: s.values.title,
        description: s.values.description,
        category: s.values.category,
        price: finalPrice,
        basePrice: basePrice,
        shippingBuffer: shippingBuffer,
        mrp: mrp,
        stock: Number(s.values.stock),
        ...shippingData(s),
        imageUrl: primaryUrl,
        imageFileId: primaryFileId,
        images: images,
        imageFileIds: imageFileIds,
      },
    });
  } catch (err) {
    console.error("updateProduct failed", err);
    return fail(s, "We could not save the changes. Please try again.");
  }

  // The row is saved; remove any discarded images from ImageKit.
  for (const fid of toDelete) {
    await deleteImageKitFile(fid);
  }

  return { ...s, ok: true, ref: s.values.id };
}