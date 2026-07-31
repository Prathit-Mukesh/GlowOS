import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Blueprint } from "@/lib/blueprint-rules";
import type { Module } from "@/lib/quiz-questions";
import { getEntitlement, unlockedFor } from "@/lib/entitlements";
import BlueprintReveal from "./reveal";
import BlueprintTeaser from "./teaser";
import QuizSync from "./quiz-sync";

export const metadata: Metadata = { title: "Your Blueprint" };
export const dynamic = "force-dynamic";

/**
 * /blueprint — the reveal. Logged-out users get the teaser built from their
 * quiz session (sign-in required for the full plan). Logged-in users get the
 * radar + module cards; free tier unlocks exactly ONE module (their top
 * priority). Entitlement is decided here, server-side, from the DB — never
 * from anything the client claims.
 */
export default async function BlueprintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <BlueprintTeaser />;
  }

  const [{ data: score }, { data: bpRow }, entitlement] = await Promise.all([
    supabase
      .from("polish_scores")
      .select("body, skin, style, mind, voice, total")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("blueprints")
      .select("content, model_used")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getEntitlement(supabase, user.id),
  ]);

  if (!score || !bpRow) {
    // Signed in but nothing stored yet — try syncing answers stashed by an
    // anonymous quiz session, else point at the quiz.
    return <QuizSync />;
  }

  const blueprint = bpRow.content as Blueprint;
  // Everyone gets an AI-personalised plan for free. If the stored plan is
  // still the instant rules-based one, upgrade it in the background.
  const needsAiUpgrade = bpRow.model_used === "rules-v1";
  // GlowOS is free for all — every module is unlocked. See lib/entitlements.
  const unlocked = unlockedFor(
    entitlement.hasFullAccess,
    (blueprint.polish_priorities[0] ?? "mind") as Module
  );

  return (
    <BlueprintReveal
      scores={{
        body: score.body,
        skin: score.skin,
        style: score.style,
        mind: score.mind,
        voice: score.voice,
      }}
      total={score.total}
      blueprint={blueprint}
      unlocked={unlocked}
      needsAiUpgrade={needsAiUpgrade}
    />
  );
}
