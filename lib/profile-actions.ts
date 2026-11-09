"use server";

import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";
import { rememberCache, invalidateUserCache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

export type ProfileView = {
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  role: "BUYER" | "ADMIN";
  createdAt: string;
  orderCount: number;
};

export type ProfileResult = { ok: true; profile: ProfileView } | { ok: false; message: string };

export type UpdateResult =
  | { ok: true; profile: ProfileView }
  | { ok: false; message?: string; errors?: Record<string, string> };

async function fetchUserFromDb(c: { uid: string; email?: string }) {
  return prisma.user.findFirst({
    where: { OR: [{ firebaseUid: c.uid }, ...(c.email ? [{ email: c.email }] : [])] },
    include: { _count: { select: { orders: true } } },
  });
}

function toView(u: NonNullable<Awaited<ReturnType<typeof fetchUserFromDb>>>): ProfileView {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    photoUrl: u.photoUrl,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    orderCount: u._count.orders,
  };
}

export async function getProfile(idToken: string): Promise<ProfileResult> {
  try {
    const c = await verifyFirebaseToken(idToken);
    const profile = await rememberCache(
      CACHE_KEYS.userProfile(c.uid),
      CACHE_TTL.USER_PROFILE,
      async () => {
        const user = await fetchUserFromDb(c);
        return user ? toView(user) : null;
      }
    );

    if (!profile) return { ok: false, message: "We could not find your account. Please sign in again." };
    return { ok: true, profile };
  } catch (err) {
    console.error("getProfile failed", err);
    return { ok: false, message: "We could not load your profile. Please try again." };
  }
}

export async function updateProfile(
  idToken: string,
  input: { name: string; phone: string },
): Promise<UpdateResult> {
  try {
    const name = input.name.trim();
    let phone = input.phone.trim();
    const errors: Record<string, string> = {};

    if (!name) errors.name = "Name is required";
    else if (name.length > 80) errors.name = "Name must be 80 characters or fewer";

    if (phone) {
      let d = phone.replace(/\D/g, "");
      if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
      if (!/^[6-9]\d{9}$/.test(d)) errors.phone = "Enter a 10-digit Indian mobile number";
      else phone = d;
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    const c = await verifyFirebaseToken(idToken);
    const user = await fetchUserFromDb(c);
    if (!user) return { ok: false, message: "We could not find your account. Please sign in again." };

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, phone: phone || null },
      include: { _count: { select: { orders: true } } },
    });

    // Invalidate Redis user cache on update
    await invalidateUserCache(c.uid);

    return { ok: true, profile: toView(updated) };
  } catch (err) {
    console.error("updateProfile failed", err);
    return { ok: false, message: "We could not save your changes. Please try again." };
  }
}