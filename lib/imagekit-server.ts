import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";

// Server-only helpers (no "use server": these must never be callable from the browser).

// Throws unless the token belongs to an ADMIN user.
export async function requireAdmin(idToken: string) {
  const c = await verifyFirebaseToken(idToken);
  const user = await prisma.user.findFirst({
    where: { OR: [{ firebaseUid: c.uid }, ...(c.email ? [{ email: c.email }] : [])] },
    select: { id: true, role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("NOT_ADMIN");
  return user;
}

// Deletes a file from ImageKit by its fileId. Returns true when the file is gone
// (a 404 counts, since the goal is "it no longer exists").
export async function deleteImageKitFile(fileId: string): Promise<boolean> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || !fileId) return false;

  try {
    const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    });
    if (res.ok || res.status === 404) return true;
    console.error("ImageKit delete failed", res.status, await res.text().catch(() => ""));
    return false;
  } catch (err) {
    console.error("ImageKit delete failed", err);
    return false;
  }
}