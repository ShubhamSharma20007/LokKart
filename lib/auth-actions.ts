"use server";

import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/firebase-token";
import { rememberCache, invalidateUserCache, setCache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

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

    const userEmail = c.email;
    const userUid = c.uid;

    // Check Redis session cache first for fast repeat visits
    const sessionKey = CACHE_KEYS.userSession(userUid);
    const cachedSession = await rememberCache(sessionKey, CACHE_TTL.USER_SESSION, async () => {
      const photoUrl = c.picture ?? null;
      const login = { photoUrl, lastLoginAt: new Date() };

      const byUid = await prisma.user.findUnique({ where: { email: userEmail } });
      const user = byUid
        ? await prisma.user.update({ where: { id: byUid.id }, data: login })
        : await prisma.user.upsert({
            where: { email: userEmail },
            update: { firebaseUid: userUid, ...login },
            create: { firebaseUid: userUid, email: userEmail, name: c.name || userEmail.split("@")[0], ...login },
          });

      // Also prime the user ID cache for instant order/profile checks
      void setCache(CACHE_KEYS.userId(userUid), { id: user.id }, CACHE_TTL.USER_SESSION);

      return { id: user.id, name: user.name, email: user.email, photoUrl: user.photoUrl, role: user.role };
    });

    return {
      ok: true,
      user: cachedSession,
    };
  } catch (err) {
    console.error("syncUser failed", err);
    return { ok: false, message: "We could not finish signing you in. Please try again." };
  }
}

/**
 * Server action to clear user session and profile cache in Redis upon logout
 */
export async function clearUserSession(idToken?: string | null): Promise<void> {
  if (!idToken) return;
  try {
    const c = await verifyFirebaseToken(idToken).catch(() => null);
    if (c?.uid) {
      await invalidateUserCache(c.uid);
      console.log(`[Auth] User session & profile successfully purged from Redis for uid: ${c.uid}`);
    }
  } catch (err) {
    console.warn("[clearUserSession] Failed to clear user session from Redis:", err);
  }
}