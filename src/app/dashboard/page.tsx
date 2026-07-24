import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTodayActions } from "@/lib/daily-actions";
import { MODULE_META, MODULES } from "@/lib/quiz-questions";
import DailyLoop from "./daily-loop";
import RegenButton from "./regen-button";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

// Server components render per request; this is request-time data, not render
// impurity in the client-component sense.
function weekAgoUtc(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
}

/**
 * /dashboard — the daily loop (Phase 2): today's 3 checkable micro-actions,
 * streak counter + pet, weekly recap card, module quick-links.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/dashboard");

  const weekAgo = weekAgoUtc();

  const [{ data: profile }, { data: score }, { data: streak }, actions, { data: weekRows }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("polish_scores")
        .select("total")
        .eq("user_id", user.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("streaks")
        .select("current, longest, pet_stage")
        .eq("user_id", user.id)
        .maybeSingle(),
      ensureTodayActions(supabase, user.id),
      supabase
        .from("daily_actions")
        .select("done")
        .eq("user_id", user.id)
        .gte("action_date", weekAgo),
    ]);

  const weekDone = (weekRows ?? []).filter((r) => r.done).length;
  const weekTotal = (weekRows ?? []).length;

  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-400">Good to see you,</p>
          <h1 className="text-2xl font-extrabold">{profile?.display_name ?? "Glow-getter"} ✨</h1>
        </div>
        <Link href="/blueprint" className="text-xs font-semibold text-violet-soft">
          Blueprint →
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-500">Polish Score</p>
          <p className="mt-1 text-4xl font-extrabold text-gold-soft">{score?.total ?? "—"}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Streak</p>
          <p className="mt-1 text-4xl font-extrabold text-teal-soft">
            {streak?.current ?? 0}
            <span className="text-base font-medium text-slate-500"> days</span>
          </p>
          <p className="text-[11px] text-slate-600">best: {streak?.longest ?? 0}</p>
        </div>
      </section>

      {actions.length > 0 ? (
        <DailyLoop
          actions={actions}
          streak={{
            current: streak?.current ?? 0,
            longest: streak?.longest ?? 0,
            pet_stage: streak?.pet_stage ?? 0,
          }}
        />
      ) : (
        <section className="card text-center">
          <p className="text-3xl" aria-hidden>
            🧭
          </p>
          <h2 className="mt-1 font-bold">No plan for today yet</h2>
          <p className="mt-1 text-sm text-slate-400">
            Take the quiz to build your Blueprint — today&apos;s actions come from it.
          </p>
          <Link href="/quiz" className="btn-primary mt-4 w-full">
            Take the quiz
          </Link>
        </section>
      )}

      {/* Weekly recap */}
      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">This week</h2>
          <span className="text-xs text-slate-500">last 7 days</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <p className="text-3xl font-extrabold text-violet-soft">
            {weekDone}
            <span className="text-base font-medium text-slate-500">/{weekTotal || "—"}</span>
          </p>
          <p className="text-sm text-slate-400">
            actions completed.{" "}
            {weekDone === 0
              ? "Every glow-up starts with one tick."
              : weekDone >= weekTotal * 0.8
                ? "Outstanding consistency — this is how it compounds."
                : "Solid — consistency beats intensity."}
          </p>
        </div>
      </section>

      {/* Module quick-links */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Modules</h2>
        <div className="grid grid-cols-2 gap-3">
          {MODULES.map((m) => (
            <Link key={m} href={`/module/${m}`} className="card !p-4 transition hover:border-white/15">
              <span className="text-2xl" aria-hidden>
                {MODULE_META[m].emoji}
              </span>
              <p className="mt-1 text-sm font-semibold">{MODULE_META[m].label}</p>
              <p className="text-[11px] text-slate-500">{MODULE_META[m].blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <RegenButton />
    </main>
  );
}
