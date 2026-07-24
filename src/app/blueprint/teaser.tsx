"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import RadarChart from "@/components/radar-chart";
import { MODULES, type Module } from "@/lib/quiz-questions";

type Scores = Record<Module, number> & { total: number };

function isScores(v: unknown): v is Scores {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return [...MODULES, "total"].every(
    (k) => typeof o[k] === "number" && (o[k] as number) >= 0 && (o[k] as number) <= 100
  );
}

// sessionStorage never notifies, so subscribe is a no-op; the store pattern
// still gives us a hydration-safe read (server snapshot -> client snapshot).
const noopSubscribe = () => () => {};

/**
 * Anonymous teaser: shows the radar + total from the just-taken quiz
 * (sessionStorage) and asks the user to sign in for the full Blueprint.
 * Falls back to a quiz CTA when there's nothing in the session.
 */
export default function BlueprintTeaser({ noData = false }: { noData?: boolean }) {
  // undefined = still server-rendering/hydrating; null = nothing stored.
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem("glowos.score"),
    () => undefined
  );

  const scores = useMemo<Scores | null>(() => {
    if (typeof raw !== "string") return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isScores(parsed) ? parsed : null;
    } catch {
      return null; // corrupt storage — treat as absent
    }
  }, [raw]);

  if (raw === undefined) {
    return (
      <main className="flex flex-col gap-4 pt-10">
        <div className="skeleton h-8 w-40 self-center" />
        <div className="skeleton mx-auto h-64 w-64 rounded-full" />
        <div className="skeleton h-24" />
      </main>
    );
  }

  if (!scores || noData) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
        <p className="text-5xl" aria-hidden>
          🧭
        </p>
        <h1 className="text-2xl font-bold">Let’s find your starting point</h1>
        <p className="max-w-xs text-sm text-slate-400">
          Take the free 2-minute quiz and we’ll map your Polish Score across all five modules.
        </p>
        <Link href="/quiz" className="btn-primary w-full">
          Take the quiz →
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 pb-16 pt-8">
      <header className="text-center">
        <p className="text-sm text-slate-400">Your Polish Score</p>
        <motion.p
          className="text-6xl font-extrabold text-gold-soft"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.2 }}
        >
          {scores.total}
        </motion.p>
        <p className="mt-1 text-xs text-slate-500">measures habits & consistency — never looks</p>
      </header>

      <div className="flex justify-center">
        <RadarChart
          scores={{
            body: scores.body,
            skin: scores.skin,
            style: scores.style,
            mind: scores.mind,
            voice: scores.voice,
          }}
        />
      </div>

      {/* Locked blueprint preview */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="card pointer-events-none select-none blur-sm" aria-hidden>
          <h2 className="font-bold">Your personalised Blueprint</h2>
          <p className="mt-2 text-sm text-slate-400">
            Week one starts with three same-day wins across your priority modules, then builds a
            keystone habit for each of the five dimensions…
          </p>
          <div className="mt-3 h-24 rounded-xl bg-navy-800" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-900/60 p-6 text-center">
          <p className="font-semibold">Your full Blueprint is ready 🎁</p>
          <p className="text-xs text-slate-400">
            Create a free account to unlock it — your answers carry over automatically.
          </p>
          <Link href="/auth?next=/blueprint" className="btn-primary w-full">
            Sign in to reveal my Blueprint
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-slate-600">
        Free forever tier · no card needed · delete your data anytime
      </p>
    </main>
  );
}
