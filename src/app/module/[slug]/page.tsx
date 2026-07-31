import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Blueprint } from "@/lib/blueprint-rules";
import { MODULE_META, MODULES, type Module } from "@/lib/quiz-questions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = MODULES.find((x) => x === slug);
  return { title: m ? `${MODULE_META[m].label} plan` : "Module" };
}

/**
 * /module/[slug] — full weekly plan for one module, with "why this advice"
 * expandable on every card. Slug is whitelisted against MODULES (no dynamic
 * table access from user input). Entitlement enforced server-side.
 */
export default async function ModulePage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = MODULES.find((m) => m === rawSlug);
  if (!slug) notFound();
  const moduleKey: Module = slug;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/module/${moduleKey}`);

  const [{ data: bpRow }, { data: sub }] = await Promise.all([
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

  if (!bpRow) redirect("/blueprint");

  const blueprint = bpRow.content as Blueprint;
  const isPaid =
    !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  const unlockedModule = (blueprint.polish_priorities[0] ?? "mind") as Module;

  if (!isPaid && moduleKey !== unlockedModule) {
    // Free tier: only the top-priority module is unlocked.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 text-center">
        <p className="text-5xl" aria-hidden>
          🔒
        </p>
        <h1 className="text-2xl font-bold">{MODULE_META[moduleKey].label} is a Glow Pass module</h1>
        <p className="max-w-xs text-sm text-slate-400">
          Your free plan includes <strong>{MODULE_META[unlockedModule].label}</strong>. Glow Pass
          (₹199/mo) unlocks all five modules.
        </p>
        <Link href="/pricing" className="btn-primary w-full">
          Unlock everything
        </Link>
        <Link href="/blueprint" className="btn-ghost w-full">
          Back to Blueprint
        </Link>
      </main>
    );
  }

  const mod = blueprint.modules[moduleKey];

  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <Link href="/blueprint" className="text-sm text-slate-500 hover:text-slate-300">
        ← Blueprint
      </Link>

      <header className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {MODULE_META[moduleKey].emoji}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">{MODULE_META[moduleKey].label}</h1>
          <p className="text-sm text-slate-400">{MODULE_META[moduleKey].blurb}</p>
        </div>
      </header>

      <section className="card">
        <p className="text-sm text-slate-300">{mod.summary}</p>
        <p className="mt-3 rounded-xl bg-violet/10 px-3 py-2 text-sm">
          <span className="font-semibold text-violet-soft">Keystone habit: </span>
          {mod.keystone_habit}
        </p>
        {mod.refer_out ? (
          <p className="mt-3 rounded-xl bg-teal/10 px-3 py-2 text-xs text-teal-soft">
            For part of this area, a {mod.refer_out} is the right person — our plan stays gentle and
            general.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">This week</h2>
        {mod.weekly_plan.map((day) => (
          <div key={day.day} className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Day {day.day}
            </p>
            {day.actions.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Rest day for this module 🌿</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {day.actions.map((a) => (
                  <details key={a.title} className="rounded-xl bg-navy-800/80 p-3">
                    <summary className="cursor-pointer list-none text-sm">
                      <span className="font-medium">{a.title}</span>
                      <span className="ml-2 text-xs text-slate-500">{a.minutes} min</span>
                      <span className="float-right text-xs text-violet-soft">why this?</span>
                    </summary>
                    <div className="mt-2 text-xs leading-relaxed text-slate-400">
                      <p>{a.detail}</p>
                      <p className="mt-1 text-slate-600">
                        Evidence level: <strong>{a.evidence}</strong>
                        {a.evidence === "strong"
                          ? " — broad scientific consensus."
                          : a.evidence === "moderate"
                            ? " — good but mixed evidence."
                            : " — coach/stylist convention, low risk."}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-slate-600">
        Progress logging arrives with the daily dashboard — coming in the next update.
      </p>
    </main>
  );
}
