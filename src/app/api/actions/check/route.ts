import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { petStageFor } from "@/lib/daily-actions";
import { MODULES } from "@/lib/quiz-questions";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    id: z.string().uuid(),
    done: z.boolean(),
  })
  .strict();

const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * POST /api/actions/check — check off (or un-check) a daily action.
 * Checking one = update daily_actions + update streak + bump score (spec).
 * RLS scopes every statement to the caller; the score only ever goes UP —
 * un-checking never decreases it (streak resets, score doesn't).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { id, done } = parsed.data;

    // Load the action first (RLS: only own rows are visible).
    const { data: action } = await supabase
      .from("daily_actions")
      .select("id, module, done")
      .eq("id", id)
      .maybeSingle();
    if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const wasDone = action.done as boolean;
    const { error: updErr } = await supabase
      .from("daily_actions")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    let streakOut: { current: number; longest: number; pet_stage: number } | null = null;

    // Only a fresh completion moves streak + score.
    if (done && !wasDone) {
      // --- streak ---------------------------------------------------------
      const { data: streak } = await supabase
        .from("streaks")
        .select("current, longest, last_checkin")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = todayUtc();
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

      let current = streak?.current ?? 0;
      if (streak?.last_checkin === today) {
        // already checked in today — streak unchanged
      } else if (streak?.last_checkin === yesterday) {
        current += 1;
      } else {
        current = 1;
      }
      const longest = Math.max(current, streak?.longest ?? 0);
      const pet_stage = petStageFor(current);

      await supabase
        .from("streaks")
        .upsert(
          { user_id: user.id, current, longest, last_checkin: today, pet_stage },
          { onConflict: "user_id" }
        );
      streakOut = { current, longest, pet_stage };

      // --- score bump: +1 on the action's module, capped at 100 ------------
      const { data: latest } = await supabase
        .from("polish_scores")
        .select("body, skin, style, mind, voice, version")
        .eq("user_id", user.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest && MODULES.includes(action.module as (typeof MODULES)[number])) {
        const dims = {
          body: latest.body,
          skin: latest.skin,
          style: latest.style,
          mind: latest.mind,
          voice: latest.voice,
        };
        const key = action.module as keyof typeof dims;
        dims[key] = Math.min(100, dims[key] + 1);
        const total = Math.round(
          (dims.body + dims.skin + dims.style + dims.mind + dims.voice) / 5
        );
        await supabase.from("polish_scores").insert({
          user_id: user.id,
          version: latest.version ?? "score-v1",
          ...dims,
          total,
        });
      }
    }

    return NextResponse.json({ ok: true, streak: streakOut });
  } catch (err) {
    console.error("[api/actions/check] unhandled", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
