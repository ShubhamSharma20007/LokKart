"use server";

import { createHmac, randomUUID } from "node:crypto";
import { requireAdmin } from "./imagekit-server";

export type ImageKitAuth =
  | { ok: true; token: string; expire: number; signature: string; publicKey: string }
  | { ok: false; message: string };

// Signs a short-lived upload so the browser can send the file straight to ImageKit.
// The private key never leaves the server. Only admins can get a signature.
export async function getImageKitAuth(idToken: string): Promise<ImageKitAuth> {
  try {
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return { ok: false, message: "Image uploads are not set up yet. Check the ImageKit keys in .env." };
    }

    try {
      await requireAdmin(idToken);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_ADMIN") {
        return { ok: false, message: "Only admins can upload product images." };
      }
      throw err;
    }

    const token = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 30 * 60; // must be under 1 hour
    const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");

    return { ok: true, token, expire, signature, publicKey };
  } catch (err) {
    console.error("getImageKitAuth failed", err);
    return { ok: false, message: "We could not start the upload. Please try again." };
  }
}