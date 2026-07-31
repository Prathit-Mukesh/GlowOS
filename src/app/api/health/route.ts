import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — deployment self-check.
 *
 * Exists because a misconfigured deployment previously surfaced to users as a
 * single generic "couldn't send the link" message, with no way to tell a bad
 * API key from an exhausted email quota without guessing.
 *
 * DISCLOSURE BOUNDARY — this endpoint is public, so it reports only booleans
 * and coarse status text. It never returns key values, key prefixes, lengths,
 * project identifiers, connection strings, or error bodies from upstream. An
 * attacker learns only "this site is or isn't correctly configured", which is
 * already inferable by trying to sign in; the operator learns which of four
 * specific things to fix.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const checks: Record<string, string> = {};

  // 1. Are the required env vars present at all?
  checks.supabase_url_set = url ? "ok" : "MISSING";
  checks.anon_key_set = anon ? "ok" : "MISSING";
  checks.service_key_set = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "MISSING";
  checks.anthropic_key_set = process.env.ANTHROPIC_API_KEY
    ? "ok"
    : "MISSING — no AI plans; every user gets the rules-based plan instead";
  checks.upstash_set =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? "ok"
      : "missing — rate limiting degraded (AI still capped in the database)";

  // 2. Does the anon key actually authenticate? This is the check that would
  //    have identified the sign-in outage immediately.
  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anon },
        cache: "no-store",
      });
      checks.anon_key_valid =
        res.status === 200
          ? "ok"
          : res.status === 401
            ? "INVALID — rotate NEXT_PUBLIC_SUPABASE_ANON_KEY"
            : `unexpected status ${res.status}`;
    } catch {
      checks.anon_key_valid = "UNREACHABLE — cannot reach Supabase auth";
    }

    // 3. Is the REST/Data API healthy? (503 here means PostgREST schema cache.)
    try {
      const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
        headers: { apikey: anon },
        cache: "no-store",
      });
      checks.database_reachable =
        res.status < 400
          ? "ok"
          : res.status === 503
            ? "DEGRADED — Data API not serving (restart the Supabase project)"
            : `error status ${res.status}`;
    } catch {
      checks.database_reachable = "UNREACHABLE";
    }
  }

  const healthy = !Object.values(checks).some((v) => v === "MISSING" || /^[A-Z]/.test(v));

  return NextResponse.json(
    { healthy, checks, note: "Booleans only — no secrets are ever returned by this endpoint." },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
