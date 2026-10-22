"use server";

import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";

export type SyncedUser = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: "BUYER" | "ADMIN";
};

export type SyncResult = { ok: true; user: SyncedUser } | { ok: false; message: string };

export async function syncUser(idToken: string): Promise<SyncResult> {
  try {
    const c = await verifyFirebaseToken(idToken);
    if (!c.email || !c.emailVerified) {
      return { ok: false, message: "Your Google account needs a verified email address." };
    }

    const photoUrl = c.picture ?? null;
    const login = { photoUrl, lastLoginAt: new Date() };

    const byUid = await prisma.user.findUnique({ where: { email: c.email } });
    const user = byUid
      ? await prisma.user.update({ where: { id: byUid.id }, data: login })
      : await prisma.user.upsert({
          where: { email: c.email },
          // Links an existing row with the same email, or creates a new buyer.
          update: { firebaseUid: c.uid, ...login },
          create: { firebaseUid: c.uid, email: c.email, name: c.name || c.email.split("@")[0], ...login },
        });

    return {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, photoUrl: user.photoUrl, role: user.role },
    };
  } catch (err) {
    console.error("syncUser failed", err);
    return { ok: false, message: "We could not finish signing you in. Please try again." };
  }
}