import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/rate-limit";
import { generateBlueprint } from "@/lib/ai/generate-blueprint";
import { getEntitlement } from "@/lib/entitlements";

export const runtime = "nodejs";
// AI generation can take a while at higher output sizes.
export const maxDuration = 120;

/**
 * POST /api/ai/blueprint — regenerate the user's Blueprint with the AI brain.
 * Hardening (spec §3/§4): session required; per-user AI rate limit (30/day,
 * free for all); regen cap 2/day; browser NEVER talks to the AI provider —
 * only this server route does.
 */
export async function POST(request: NextRequest) {
  void request;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Entitlement from the DB, never from the client (spec §6).
    const entitlement = await getEntitlement(supabase, user.id);

    // GlowOS is free for all, so everyone gets the generous AI allowance
    // (30/day) rather than the old free tier's 10/day. The 2-regens-per-day
    // cap below is the real cost control and applies to everyone equally.
    const limit = await checkLimit(entitlement.hasFullAccess ? "aiPaid" : "aiFree", user.id);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ---- Database-backed daily caps (the REAL spend control) --------------
    // These run in Postgres, so they hold even when Redis is unreachable —
    // which is exactly why the AI limiter above can safely fail open.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const { count: totalToday } = await supabase
      .from("blueprints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart.toISOString());

    // Backstop: counts EVERY blueprint row written today, including the rules
    // rows produced by a failed AI attempt. Without this, a user whose
    // generations kept failing could retry indefinitely and still burn tokens
    // on each attempt, because failures never increment the AI-only counter.
    if ((totalToday ?? 0) >= 8) {
      return NextResponse.json(
        { error: "Daily plan limit reached — try again tomorrow" },
        { status: 429 }
      );
    }

    // Max 2 successful AI regenerations per day per user (rules rows excluded).
    const { count } = await supabase
      .from("blueprints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("model_used", "rules-v1")
      .gte("created_at", dayStart.toISOString());
    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: "Daily regeneration limit reached — try again tomorrow" },
        { status: 429 }
      );
    }

    const result = await generateBlueprint(supabase, user.id);
    return NextResponse.json({
      ok: true,
      engine: result.engine,
      blueprint: result.blueprint,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "no_quiz_data") {
      return NextResponse.json({ error: "Take the quiz first" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "age_gate") {
      return NextResponse.json({ error: "Not available" }, { status: 403 });
    }
    console.error("[api/ai/blueprint] unhandled", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
