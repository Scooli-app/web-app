interface CacheEntry {
  data: unknown;
  at: number;
}

/**
 * Short-lived, in-memory cache for dashboard cards. It lives at module level,
 * so it survives client-side navigations, including sign-out → sign-in and
 * Clerk account switches in the same tab. Every read and write therefore names
 * the Clerk user it is for, and the cache only ever holds one user's data: a
 * call for a different user drops everything cached for the previous one.
 */
class DashboardCache {
  private ownerId: string | null = null;
  private store = new Map<string, CacheEntry>();

  private claim(userId: string): void {
    if (this.ownerId !== userId) {
      this.store.clear();
      this.ownerId = userId;
    }
  }

  get<T>(userId: string, key: string, ttlMs: number): T | null {
    this.claim(userId);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(userId: string, key: string, data: T): void {
    this.claim(userId);
    this.store.set(key, { data, at: Date.now() });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Drops everything, e.g. on sign-out or when the signed-in user changes. */
  clear(): void {
    this.store.clear();
    this.ownerId = null;
  }
}

export const dashboardCache = new DashboardCache();

export const CACHE_KEYS = {
  RECENT_DOCUMENTS: "recent-documents",
  UPCOMING_LESSONS: "upcoming-lessons",
} as const;

export const CACHE_TTL = {
  RECENT_DOCUMENTS: 3 * 60 * 1000,  // 3 min
  UPCOMING_LESSONS: 2 * 60 * 1000,  // 2 min
} as const;
