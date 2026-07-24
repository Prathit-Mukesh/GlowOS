import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULE_META, MODULES } from "@/lib/quiz-questions";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * /dashboard — Phase 1 shell. Shows latest score, streak and module links.
 * The full daily loop (3 checkable micro-actions + streak pet) ships in
 * Phase 2 alongside the AI brain.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/dashboard");

  const [{ data: profile }, { data: score }, { data: streak }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("polish_scores")
      .select("total")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("streaks").select("current, longest").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <header>
        <p className="text-sm text-slate-400">Good to see you,</p>
        <h1 className="text-2xl font-extrabold">{profile?.display_name ?? "Glow-getter"} ✨</h1>
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
        </div>
      </section>

      <section className="card text-center">
        <p className="text-3xl" aria-hidden>
          🐣
        </p>
        <h2 className="mt-1 font-bold">Your daily loop is hatching</h2>
        <p className="mt-1 text-sm text-slate-400">
          Daily micro-actions, your streak pet and weekly recaps arrive in the next update. For now,
          your Blueprint has everything to get started.
        </p>
        <Link href="/blueprint" className="btn-primary mt-4 w-full">
          Open my Blueprint
        </Link>
      </section>

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
    </main>
  );
}
