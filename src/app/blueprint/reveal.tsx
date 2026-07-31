"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import RadarChart from "@/components/radar-chart";
import { MODULE_META, MODULES, type Module } from "@/lib/quiz-questions";
import type { Blueprint } from "@/lib/blueprint-rules";
import AutoUpgrade from "./auto-upgrade";

interface Props {
  scores: Record<Module, number>;
  total: number;
  blueprint: Blueprint;
  unlocked: Module[];
  needsAiUpgrade: boolean;
}

/** The signed-in Blueprint reveal: radar, top actions, gated module cards. */
export default function BlueprintReveal({
  scores,
  total,
  blueprint,
  unlocked,
  needsAiUpgrade,
}: Props) {
  const [open, setOpen] = useState<Module | null>(null);

  const topActions = blueprint.polish_priorities.slice(0, 3).map((p) => {
    const mod = blueprint.modules[p as Module];
    return { module: p as Module, habit: mod?.keystone_habit ?? "" };
  });

  return (
    <main className="flex flex-col gap-8 pb-16 pt-8">
      {needsAiUpgrade ? <AutoUpgrade /> : null}

      <header className="text-center">
        <p className="text-sm text-slate-400">Your Polish Score</p>
        <motion.p
          className="text-6xl font-extrabold text-gold-soft"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.2 }}
        >
          {total}
        </motion.p>
        <p className="mt-1 text-xs text-slate-500">measures habits & consistency — never looks</p>
      </header>

      <div className="flex justify-center">
        <RadarChart scores={scores} />
      </div>

      <section className="card">
        <p className="text-sm leading-relaxed text-slate-300">{blueprint.user_summary}</p>
        {blueprint.sprint_focus ? (
          <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-soft">
            🎯 {blueprint.sprint_focus}
          </p>
        ) : null}
      </section>

      {/* Top 3 highest-impact actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Start here — your top 3</h2>
        {topActions.map((t, i) => (
          <motion.div
            key={t.module}
            className="card flex items-start gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
          >
            <span className="text-2xl" aria-hidden>
              {MODULE_META[t.module].emoji}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-violet-soft">
                {MODULE_META[t.module].label}
              </p>
              <p className="mt-0.5 text-sm font-medium">{t.habit}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Module cards */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Your five modules</h2>
          <span className="chip border-teal/40 text-teal-soft">all unlocked · free</span>
        </div>
        {MODULES.map((m) => {
          const mod = blueprint.modules[m];
          const isOpen = open === m;
          const isUnlocked = unlocked.includes(m);
          return (
            <div key={m} className="card">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setOpen(isOpen ? null : m)}
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden>
                    {MODULE_META[m].emoji}
                  </span>
                  <span>
                    <span className="font-semibold">{MODULE_META[m].label}</span>
                    <span className="block text-xs text-slate-500">
                      {MODULE_META[m].blurb}
                    </span>
                  </span>
                </span>
                <span className="text-slate-500">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && isUnlocked ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
                  <p className="text-sm text-slate-400">{mod.summary}</p>
                  <p className="rounded-xl bg-violet/10 px-3 py-2 text-sm">
                    <span className="font-semibold text-violet-soft">Keystone habit: </span>
                    {mod.keystone_habit}
                  </p>
                  {mod.refer_out ? (
                    <p className="rounded-xl bg-teal/10 px-3 py-2 text-xs text-teal-soft">
                      For this area, a {mod.refer_out} can help you best — we’ll keep things gentle
                      here.
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    {mod.weekly_plan
                      .filter((d) => d.actions.length > 0)
                      .slice(0, 3)
                      .map((d) => (
                        <div key={d.day} className="rounded-xl bg-navy-800/80 p-3">
                          <p className="text-xs font-semibold text-slate-500">Day {d.day}</p>
                          {d.actions.map((a) => (
                            <details key={a.title} className="mt-1">
                              <summary className="cursor-pointer list-none text-sm">
                                <span className="font-medium">{a.title}</span>
                                <span className="ml-2 text-xs text-slate-500">{a.minutes} min</span>
                              </summary>
                              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                {a.detail}
                                <span className="mt-1 block text-slate-600">
                                  Why this: evidence level “{a.evidence}”.
                                </span>
                              </p>
                            </details>
                          ))}
                        </div>
                      ))}
                  </div>
                  <Link href={`/module/${m}`} className="btn-ghost text-sm">
                    Open full {MODULE_META[m].label} plan
                  </Link>
                </div>
              ) : null}

            </div>
          );
        })}
      </section>

      {/* Week-one wins */}
      <section className="card border-teal/30">
        <h2 className="font-bold text-teal-soft">This week’s instant wins</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {blueprint.week_one_wins.map((w) => (
            <li key={w} className="text-sm text-slate-300">
              ✓ {w}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-sm italic text-slate-400">{blueprint.encouragement}</p>

      <Link href="/dashboard" className="btn-primary">
        Go to my daily dashboard →
      </Link>
    </main>
  );
}
