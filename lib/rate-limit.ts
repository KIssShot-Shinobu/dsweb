type RateLimitEntry = {
    count: number;
    resetAt: number;
};

type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetAt: number;
};

type RateLimitOptions = {
    windowMs: number;
    max: number;
};

const GLOBAL_KEY = "__ds_rate_limit_store__";

function getStore() {
    const globalScope = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, RateLimitEntry> };
    if (!globalScope[GLOBAL_KEY]) {
        globalScope[GLOBAL_KEY] = new Map();
    }
    return globalScope[GLOBAL_KEY];
}

function cleanupStore(store: Map<string, RateLimitEntry>, now: number) {
    if (store.size < 5000) return;
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) {
            store.delete(key);
        }
    }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const store = getStore();
    const now = Date.now();
    cleanupStore(store, now);

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
        const resetAt = now + options.windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: Math.max(0, options.max - 1), resetAt };
    }

    if (existing.count >= options.max) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    store.set(key, existing);
    return { allowed: true, remaining: Math.max(0, options.max - existing.count), resetAt: existing.resetAt };
}
