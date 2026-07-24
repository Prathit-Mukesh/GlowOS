"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUIZ_QUESTIONS, type QuizQuestion } from "@/lib/quiz-questions";
import { quizSchema } from "@/lib/validation/quiz";

type Answers = Record<string, string | string[] | number>;

/**
 * Swipeable 12-question quiz. No login required to take it; answers are kept
 * in sessionStorage so the /auth flow can attach them to the new account.
 * Client-side Zod is UX only — the server re-validates everything.
 */
export default function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const q = QUIZ_QUESTIONS[step]!;
  const total = QUIZ_QUESTIONS.length;
  const progress = ((step + 1) / total) * 100;

  const current = answers[q.key];
  const canAdvance = useMemo(() => {
    if (q.optional) return true;
    if (q.kind === "multi") return Array.isArray(current) && current.length > 0;
    return current !== undefined && current !== "";
  }, [q, current]);

  const setAnswer = useCallback(
    (value: string | string[] | number) => {
      setAnswers((prev) => ({ ...prev, [q.key]: value }));
    },
    [q.key]
  );

  const goNext = useCallback(async () => {
    setError(null);
    if (step < total - 1) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }
    // Final step → validate, stash, and go to results/auth.
    const parsed = quizSchema.safeParse(answers);
    if (!parsed.success) {
      setError("Something looks off in your answers. Please review and try again.");
      return;
    }
    setSubmitting(true);
    try {
      sessionStorage.setItem("glowos.quiz", JSON.stringify(parsed.data));
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 429) {
        setError("Whoa, lots of quizzing! Please wait a little and try again.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error("submit failed");
      const json = (await res.json()) as { score?: unknown };
      if (json.score) {
        sessionStorage.setItem("glowos.score", JSON.stringify(json.score));
      }
      router.push("/blueprint");
    } catch {
      // Even if the API hiccups, the teaser works from sessionStorage.
      router.push("/blueprint");
    }
  }, [answers, router, step, total]);

  const goBack = useCallback(() => {
    setError(null);
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  return (
    <main className="flex min-h-dvh flex-col pb-10 pt-6">
      {/* Progress */}
      <header className="mb-8 flex items-center gap-4">
        <Link href="/" aria-label="Back to home" className="text-slate-500 hover:text-slate-300">
          ✕
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-700">
          <motion.div
            className="h-full rounded-full bg-violet"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-500">
          {step + 1}/{total}
        </span>
      </header>

      {/* Question card */}
      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={q.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 && canAdvance) void goNext();
              else if (info.offset.x > 80) goBack();
            }}
            className="flex flex-col gap-6"
          >
            <div>
              <h1 className="text-2xl font-bold leading-snug">{q.title}</h1>
              {q.subtitle ? <p className="mt-2 text-sm text-slate-400">{q.subtitle}</p> : null}
            </div>
            <QuestionInput q={q} value={current} onChange={setAnswer} />
          </motion.div>
        </AnimatePresence>
      </div>

      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {/* Nav */}
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <button onClick={goBack} className="btn-ghost flex-1">
            Back
          </button>
        ) : null}
        <button
          onClick={() => void goNext()}
          disabled={!canAdvance || submitting}
          className="btn-primary flex-[2]"
        >
          {submitting ? "Scoring…" : step === total - 1 ? "See my score ✨" : "Next"}
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-600">
        Swipe left/right works too · your answers stay private
      </p>
    </main>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: QuizQuestion;
  value: string | string[] | number | undefined;
  onChange: (v: string | string[] | number) => void;
}) {
  if (q.kind === "single") {
    return (
      <div className="flex flex-col gap-3">
        {q.options!.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`card flex items-center justify-between text-left transition active:scale-[0.99] ${
                selected ? "!border-violet bg-violet/10" : "hover:border-white/15"
              }`}
              aria-pressed={selected}
            >
              <span>
                <span className="font-medium">{opt.label}</span>
                {opt.hint ? <span className="block text-xs text-slate-500">{opt.hint}</span> : null}
              </span>
              <span
                className={`ml-3 h-5 w-5 shrink-0 rounded-full border ${
                  selected ? "border-violet bg-violet" : "border-white/20"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "multi") {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (v: string) =>
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    return (
      <div className="flex flex-col gap-3">
        {q.options!.map((opt) => {
          const selected = arr.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`card flex items-center justify-between text-left transition active:scale-[0.99] ${
                selected ? "!border-teal bg-teal/10" : "hover:border-white/15"
              }`}
              aria-pressed={selected}
            >
              <span>
                <span className="font-medium">{opt.label}</span>
                {opt.hint ? <span className="block text-xs text-slate-500">{opt.hint}</span> : null}
              </span>
              <span
                className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                  selected ? "border-teal bg-teal text-navy-900" : "border-white/20"
                }`}
                aria-hidden
              >
                {selected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "scale") {
    const n = typeof value === "number" ? value : undefined;
    return (
      <div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: (q.max ?? 10) - (q.min ?? 1) + 1 }, (_, i) => i + (q.min ?? 1)).map(
            (v) => (
              <button
                key={v}
                onClick={() => onChange(v)}
                aria-pressed={n === v}
                className={`rounded-xl border py-3 text-lg font-bold tabular-nums transition active:scale-95 ${
                  n === v
                    ? "border-violet bg-violet text-white"
                    : "border-white/10 bg-navy-700/70 text-slate-300 hover:border-white/20"
                }`}
              >
                {v}
              </button>
            )
          )}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>Terrified</span>
          <span>Totally at ease</span>
        </div>
      </div>
    );
  }

  // free text (optional, capped)
  const text = typeof value === "string" ? value : "";
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value.slice(0, q.maxLength ?? 200))}
        maxLength={q.maxLength ?? 200}
        rows={4}
        placeholder="Type here… or skip, that's okay too."
        className="w-full rounded-2xl border border-white/10 bg-navy-700/70 p-4 text-sm outline-none placeholder:text-slate-600 focus:border-violet"
      />
      <p className="mt-1 text-right text-[11px] tabular-nums text-slate-600">
        {text.length}/{q.maxLength ?? 200}
      </p>
    </div>
  );
}
