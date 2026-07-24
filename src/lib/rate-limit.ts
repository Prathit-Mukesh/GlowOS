import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash sliding-window rate limits (per spec §5.3):
 *   global      100 req/min/IP     (applied in middleware)
 *   auth          5 req/min/IP
 *   AI (free)    10/day/user   AI (paid) 30/day/user   (Phase 2)
 *   quiz          3/hour/IP
 *   voice upload  5/day/user                            (Phase 3)
 *
 * If Upstash env vars are missing we fail OPEN in development (warn loudly)
 * and fail CLOSED in production for the sensitive limiters.
 */

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

function make(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `glowos:${prefix}`,
    analytics: false,
  });
}

const limiters = {
  global: make(100, "1 m", "global"),
  auth: make(5, "1 m", "auth"),
  quiz: make(3, "1 h", "quiz"),
  aiFree: make(10, "1 d", "ai-free"),
  aiPaid: make(30, "1 d", "ai-paid"),
  voice: make(5, "1 d", "voice"),
};

export type LimiterName = keyof typeof limiters;

export interface LimitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Check a named limiter for an identifier (IP or user id).
 * Sensitive limiters fail CLOSED in production when Redis is unavailable.
 */
export async function checkLimit(name: LimiterName, id: string): Promise<LimitResult> {
  const limiter = limiters[name];
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      // No Redis in prod: allow only the broad global limiter, block the rest.
      return { ok: name === "global", remaining: 0 };
    }
    console.warn(`[rate-limit] Upstash not configured — '${name}' allowed in dev`);
    return { ok: true, remaining: 999 };
  }
  const { success, remaining } = await limiter.limit(id);
  return { ok: success, remaining };
}

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : "127.0.0.1";
}
