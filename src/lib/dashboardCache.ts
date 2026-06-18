interface CacheEntry {
  data: unknown;
  at: number;
}

class DashboardCache {
  private store = new Map<string, CacheEntry>();

  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, at: Date.now() });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
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
