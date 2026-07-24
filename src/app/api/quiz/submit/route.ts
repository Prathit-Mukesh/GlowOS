import { NextResponse, type NextRequest } from "next/server";
import { quizSchema } from "@/lib/validation/quiz";
import { computePolishScore } from "@/lib/polish-score";
import { generateRulesBlueprint } from "@/lib/blueprint-rules";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/quiz/submit
 * Anyone may take the quiz (no login). If a session exists, the answers +
 * score + rules Blueprint are persisted to the user's rows; otherwise we
 * return the computed teaser only (client keeps answers in sessionStorage
 * until signup). Standard hardening order: Zod → rate limit → work.
 * Errors are generic on purpose — no internals leak.
 */
export async function POST(request: NextRequest) {
  try {
    // (a) rate limit by IP: 3 quiz submits/hour
    const ip = clientIp(request.headers);
    const limit = await checkLimit("quiz", ip);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // (b) validate body strictly
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = quizSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const answers = parsed.data;

    // (c) compute deterministic score + rules blueprint (server-side only)
    const score = computePolishScore(answers);
    const blueprint = generateRulesBlueprint(answers, score);

    // (d) persist when authenticated (RLS scopes every write to auth.uid())
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          age_band: answers.age_band,
          gender: answers.gender,
          budget_tier: answers.budget_tier,
          goals: answers.goals,
          quiz_answers: answers,
        })
        .eq("id", user.id);

      const { error: scoreErr } = await supabase.from("polish_scores").insert({
        user_id: user.id,
        version: score.version,
        body: score.body,
        skin: score.skin,
        style: score.style,
        mind: score.mind,
        voice: score.voice,
        total: score.total,
      });

      const { error: bpErr } = await supabase.from("blueprints").insert({
        user_id: user.id,
        version: blueprint.version,
        content: blueprint,
        model_used: blueprint.engine,
      });

      if (profileErr || scoreErr || bpErr) {
        console.error("[quiz/submit] persist failed", { profileErr, scoreErr, bpErr });
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
      }
      await audit("quiz_submit", { userId: user.id, ip, meta: { total: score.total } });
      await audit("score_computed", { userId: user.id, meta: { version: score.version } });
    }

    // Teaser payload for anonymous users; full data is read from DB when logged in.
    return NextResponse.json({ score, saved: !!user });
  } catch (err) {
    console.error("[quiz/submit] unhandled", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
