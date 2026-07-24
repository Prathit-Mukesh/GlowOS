import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/rate-limit";
import { generateBlueprint } from "@/lib/ai/generate-blueprint";

export const runtime = "nodejs";
// AI generation can take a while at higher output sizes.
export const maxDuration = 120;

/**
 * POST /api/ai/blueprint — regenerate the user's Blueprint with the AI brain.
 * Hardening (spec §3/§4): session required; per-user rate limit (10/day free,
 * 30/day paid); regen cap 2/day; browser NEVER talks to the AI provider —
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

    // Entitlement from the DB, never from the client.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const isPaid =
      !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    // Per-user AI rate limit: 10/day free, 30/day paid.
    const limit = await checkLimit(isPaid ? "aiPaid" : "aiFree", user.id);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Regen cap: max 2 AI regenerations per day per user (rules rows excluded).
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
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
