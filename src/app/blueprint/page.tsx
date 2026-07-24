import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Blueprint } from "@/lib/blueprint-rules";
import type { Module } from "@/lib/quiz-questions";
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

  const [{ data: score }, { data: bpRow }, { data: sub }] = await Promise.all([
    supabase
      .from("polish_scores")
      .select("body, skin, style, mind, voice, total")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("blueprints")
      .select("content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!score || !bpRow) {
    // Signed in but nothing stored yet — try syncing answers stashed by an
    // anonymous quiz session, else point at the quiz.
    return <QuizSync />;
  }

  const blueprint = bpRow.content as Blueprint;
  const isPaid =
    !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  // Free tier: unlock only the user's #1 priority module.
  const unlocked: Module[] = isPaid
    ? (["body", "skin", "style", "mind", "voice"] as Module[])
    : [(blueprint.polish_priorities[0] ?? "mind") as Module];

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
      isPaid={isPaid}
    />
  );
}
