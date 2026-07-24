"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { TodayAction } from "@/lib/daily-actions";
import { MODULE_META, type Module } from "@/lib/quiz-questions";
import StreakPet from "@/components/streak-pet";

interface Props {
  actions: TodayAction[];
  streak: { current: number; longest: number; pet_stage: number };
}

/** The daily loop: today's checkable micro-actions + the streak pet. */
export default function DailyLoop({ actions: initial, streak: initialStreak }: Props) {
  const router = useRouter();
  const [actions, setActions] = useState(initial);
  const [streak, setStreak] = useState(initialStreak);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doneCount = actions.filter((a) => a.done).length;

  async function toggle(action: TodayAction) {
    if (busy) return;
    setBusy(action.id);
    setError(null);
    const nextDone = !action.done;
    // optimistic
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, done: nextDone } : a)));
    try {
      const res = await fetch("/api/actions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: action.id, done: nextDone }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { streak?: Props["streak"] | null };
      if (json.streak) {
        setStreak(json.streak);
        router.refresh(); // pick up the score bump server-side
      }
    } catch {
      // revert on failure
      setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, done: !nextDone } : a)));
      setError("Couldn't save that — try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card border-teal/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Today&apos;s glow moves</h2>
          <p className="text-xs text-slate-500">
            {doneCount}/{actions.length} done · tiny actions, real momentum
          </p>
        </div>
        <StreakPet stage={streak.pet_stage} streak={streak.current} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {actions.map((a) => (
          <motion.button
            key={a.id}
            onClick={() => void toggle(a)}
            disabled={busy === a.id}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${
              a.done ? "border-teal/40 bg-teal/10" : "border-white/10 bg-navy-800/70 hover:border-white/20"
            }`}
            whileTap={{ scale: 0.98 }}
            aria-pressed={a.done}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm ${
                a.done ? "border-teal bg-teal text-navy-900" : "border-white/25"
              }`}
              aria-hidden
            >
              {a.done ? "✓" : ""}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-medium ${a.done ? "text-slate-400 line-through" : ""}`}>
                {MODULE_META[a.module as Module]?.emoji ?? "✨"} {a.title}
              </span>
              <span className="block text-xs text-slate-500">
                {a.minutes} min{a.description ? ` · ${a.description}` : ""}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      {doneCount === actions.length && actions.length > 0 ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-center text-sm text-gold-soft"
        >
          All done for today — your pet is thriving. See you tomorrow 🌙
        </motion.p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
