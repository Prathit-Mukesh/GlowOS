"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// sessionStorage never notifies; the store pattern gives a hydration-safe read.
const noopSubscribe = () => () => {};

/**
 * Rendered when a user is signed in but has no stored Blueprint yet.
 * If quiz answers from an anonymous session are stashed in sessionStorage,
 * re-submit them (now authenticated → they persist under RLS) and refresh.
 * Otherwise, point them at the quiz.
 */
export default function QuizSync() {
  const router = useRouter();
  const ran = useRef(false);
  // undefined = hydrating; null = no stashed answers; string = answers to sync.
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem("glowos.quiz"),
    () => undefined
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!raw || ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: raw,
        });
        if (!res.ok) throw new Error(String(res.status));
        sessionStorage.removeItem("glowos.quiz");
        sessionStorage.removeItem("glowos.score");
        router.refresh();
      } catch {
        setFailed(true); // async — safe to set state here
      }
    })();
  }, [raw, router]);

  if (failed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
        <p className="text-4xl" aria-hidden>
          😅
        </p>
        <h1 className="text-xl font-bold">That didn’t quite save</h1>
        <p className="max-w-xs text-sm text-slate-400">
          Your answers are still on this device — try again in a moment, or retake the quiz.
        </p>
        <button onClick={() => location.reload()} className="btn-primary w-full">
          Try again
        </button>
        <Link href="/quiz" className="btn-ghost w-full">
          Retake the quiz
        </Link>
      </main>
    );
  }

  // Hydrating, or actively syncing stashed answers → skeleton.
  if (raw !== null) {
    return (
      <main className="flex flex-col gap-4 pt-10">
        <p className="text-center text-sm text-slate-400">Building your Blueprint…</p>
        <div className="skeleton h-8 w-40 self-center" />
        <div className="skeleton mx-auto h-64 w-64 rounded-full" />
        <div className="skeleton h-24" />
      </main>
    );
  }

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
