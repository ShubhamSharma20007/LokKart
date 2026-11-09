import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Upstash Redis Client Initialization with Graceful Fallback (Lazy Singleton)
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;
let loggedWarning = false;

export function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({
        url,
        token,
        retry: {
          retries: 2,
          backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 500),
        },
      });
      return redisClient;
    } catch (err) {
      console.error("[Redis] Initialization failed:", err);
      return null;
    }
  }

  if (!loggedWarning) {
    console.warn(
      "[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing. Caching degraded gracefully to direct DB."
    );
    loggedWarning = true;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Standard Cache TTL Constants (in Seconds)
// ---------------------------------------------------------------------------
export const CACHE_TTL = {
  PRODUCT: 60 * 60 * 24,       // 24 hours (invalidated on product update/delete)
  RELATED_PRODUCTS: 60 * 60 * 6, // 6 hours
  CATALOG_SECTIONS: 60 * 60 * 2, // 2 hours
  ACTIVE_CATEGORIES: 60 * 60 * 12, // 12 hours
  LATEST_PRODUCT: 60 * 30,     // 30 minutes
  REVIEWS: 60 * 30,            // 30 minutes (invalidated when new review submitted)
  USER_PROFILE: 60 * 60,       // 1 hour (matches Firebase token lifetime, auto-evicted on expiry)
  USER_SESSION: 60 * 60,       // 1 hour
} as const;

// ---------------------------------------------------------------------------
// Cache Key Helper Generators (Namespaced with bachatnix: to prevent collisions)
// ---------------------------------------------------------------------------
export const CACHE_KEYS = {
  product: (id: string) => `bachatnix:product:${id}`,
  relatedProducts: (id: string, limit: number) => `bachatnix:product:related:${id}:${limit}`,
  catalogSections: (limit: number) => `bachatnix:catalog:sections:${limit}`,
  activeCategories: () => `bachatnix:catalog:categories`,
  latestProduct: () => `bachatnix:catalog:latest`,
  reviews: (productId: string, sort: string) => `bachatnix:reviews:${productId}:${sort}`,
  userProfile: (uid: string) => `bachatnix:user:profile:${uid}`,
  userSession: (uid: string) => `bachatnix:user:session:${uid}`,
  userId: (uid: string) => `bachatnix:user:id:${uid}`,
} as const;

// ---------------------------------------------------------------------------
// Safe Cache Operations (Never throws; gracefully falls back on error)
// ---------------------------------------------------------------------------

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const data = await client.get<T>(key);
    return data ?? null;
  } catch (err) {
    console.warn(`[Redis] getCache failed for key "${key}":`, err);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis] setCache failed for key "${key}":`, err);
    return false;
  }
}

export async function delCache(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis] delCache failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Remember Cache: Fetches from Redis. On cache miss, executes the fallback fetcher,
 * stores result in Redis asynchronously, and returns the result.
 */
export async function rememberCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const client = getRedis();
  if (!client) {
    return fetcher();
  }

  try {
    const cached = await client.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.warn(`[Redis] Read error on key "${key}", falling back to DB:`, err);
  }

  // Cache miss or Redis read failed: fetch from primary source
  const fresh = await fetcher();

  // Asynchronously populate cache without blocking response
  if (fresh !== null && fresh !== undefined) {
    void (async () => {
      try {
        const c = getRedis();
        await c?.set(key, fresh, { ex: ttlSeconds });
      } catch (e) {
        console.warn(`[Redis] Write error for key "${key}":`, e);
      }
    })();
  }

  return fresh;
}

// ---------------------------------------------------------------------------
// Invalidation Helpers
// ---------------------------------------------------------------------------

export async function invalidateProductCache(productId?: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const keysToDelete: string[] = [
      CACHE_KEYS.catalogSections(4),
      CACHE_KEYS.activeCategories(),
      CACHE_KEYS.latestProduct(),
    ];

    if (productId) {
      keysToDelete.push(CACHE_KEYS.product(productId));
      keysToDelete.push(CACHE_KEYS.relatedProducts(productId, 3));
      keysToDelete.push(CACHE_KEYS.relatedProducts(productId, 4));
    }

    await Promise.allSettled(keysToDelete.map((k) => client.del(k)));
    console.log(`[Redis] Invalidated product & catalog cache for id: ${productId || "all"}`);
  } catch (e) {
    console.warn("[Redis] Failed to invalidate product cache:", e);
  }
}

export async function invalidateReviewsCache(productId: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const sorts = ["latest", "oldest", "highest", "lowest"];
    const keys = sorts.map((s) => CACHE_KEYS.reviews(productId, s));
    await Promise.allSettled(keys.map((k) => client.del(k)));
    console.log(`[Redis] Invalidated reviews cache for product: ${productId}`);
  } catch (e) {
    console.warn(`[Redis] Failed to invalidate reviews for ${productId}:`, e);
  }
}

export async function invalidateUserCache(uid: string): Promise<void> {
  const client = getRedis();
  if (!client || !uid) return;
  try {
    const keysToDelete = [
      CACHE_KEYS.userProfile(uid),
      CACHE_KEYS.userSession(uid),
      CACHE_KEYS.userId(uid),
    ];
    await Promise.allSettled(keysToDelete.map((k) => client.del(k)));
    console.log(`[Redis] Invalidated user profile & session cache for uid: ${uid}`);
  } catch (e) {
    console.warn(`[Redis] Failed to invalidate user cache for uid ${uid}:`, e);
  }
}
