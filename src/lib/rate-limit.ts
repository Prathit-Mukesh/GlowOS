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

// Fail posture when Redis is unreachable/unconfigured:
//  - CLOSED for endpoints where an unmetered request costs money or security
//    (AI spend, auth abuse, storage uploads).
//  - OPEN for the cheap product-critical paths (quiz submit, global) — a
//    misconfigured Redis must not brick the free funnel; the endpoint is still
//    Zod-validated and cheap. Every fail-open is logged loudly so it shows up
//    in Vercel logs / Sentry rather than silently degrading.
const FAIL_CLOSED: Record<LimiterName, boolean> = {
  global: false,
  quiz: false,
  auth: true,
  aiFree: true,
  aiPaid: true,
  voice: true,
};

export interface LimitResult {
  ok: boolean;
  remaining: number;
}

/** Check a named limiter for an identifier (IP or user id). */
export async function checkLimit(name: LimiterName, id: string): Promise<LimitResult> {
  const limiter = limiters[name];
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[rate-limit] MISCONFIGURATION: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN ` +
          `not set — '${name}' ${FAIL_CLOSED[name] ? "BLOCKED (fail-closed)" : "allowed (fail-open)"}. ` +
          `Create an Upstash Redis DB and set both env vars.`
      );
      return { ok: !FAIL_CLOSED[name], remaining: 0 };
    }
    console.warn(`[rate-limit] Upstash not configured — '${name}' allowed in dev`);
    return { ok: true, remaining: 999 };
  }
  try {
    const { success, remaining } = await limiter.limit(id);
    return { ok: success, remaining };
  } catch (err) {
    // Redis outage mid-flight: same posture as unconfigured, loudly.
    console.error(`[rate-limit] Redis error on '${name}' — applying fail posture`, err);
    return { ok: !FAIL_CLOSED[name], remaining: 0 };
  }
}

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : "127.0.0.1";
}
