import type { Env } from "./env";

type RateLimitParams = {
  env: Env;
  key: string;
  limit: number;
  ttlSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
};

type MemoryCounter = {
  count: number;
  expiresAt: number;
};

const memoryCounters = new Map<string, MemoryCounter>();

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function cleanupMemoryCounters(now: number): void {
  for (const [key, value] of memoryCounters) {
    if (value.expiresAt <= now) {
      memoryCounters.delete(key);
    }
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function secondsUntilUtcMidnight(date = new Date()): number {
  const tomorrow = new Date(date);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((tomorrow.getTime() - date.getTime()) / 1000));
}

export async function enforceRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const now = nowSeconds();
  const hashedKey = await sha256Hex(params.key);

  if (params.env.RATE_LIMIT_KV) {
    const kv = params.env.RATE_LIMIT_KV;
    const current = Number((await kv.get(hashedKey)) ?? "0");
    const next = current + 1;
    await kv.put(hashedKey, String(next), { expirationTtl: params.ttlSeconds });
    return {
      allowed: next <= params.limit,
      count: next,
      remaining: Math.max(0, params.limit - next)
    };
  }

  cleanupMemoryCounters(now);
  const existing = memoryCounters.get(hashedKey);
  if (!existing || existing.expiresAt <= now) {
    memoryCounters.set(hashedKey, {
      count: 1,
      expiresAt: now + params.ttlSeconds
    });
    return {
      allowed: 1 <= params.limit,
      count: 1,
      remaining: Math.max(0, params.limit - 1)
    };
  }

  existing.count += 1;
  memoryCounters.set(hashedKey, existing);
  return {
    allowed: existing.count <= params.limit,
    count: existing.count,
    remaining: Math.max(0, params.limit - existing.count)
  };
}

