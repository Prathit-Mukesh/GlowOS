import type { QuizAnswers } from "./validation/quiz";

/**
 * Deterministic Polish Score — score-v1.
 *
 * Five dimensions, 0–100 each, computed server-side purely from quiz answers.
 * DESIGN RULES (from spec):
 *  - Reflects current HABITS + readiness, never attractiveness.
 *  - Same input always → same output (versioned as 'score-v1'; change the
 *    algorithm ⇒ bump the version so historical rows stay interpretable).
 *  - Scores start mid-range so early actions produce visible movement, and
 *    completing actions raises them; they never decrease from missed days.
 */

export const SCORE_VERSION = "score-v1";

export interface PolishScore {
  body: number;
  skin: number;
  style: number;
  mind: number;
  voice: number;
  total: number;
  version: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computePolishScore(a: QuizAnswers): PolishScore {
  // --- BODY: current activity is the dominant signal -------------------------
  const fitnessPts = { sedentary: 22, light: 38, moderate: 56, active: 72 }[a.fitness_level];
  const timePts = { "10": 4, "15": 6, "30": 10, "45": 12 }[a.time_per_day];
  const body = clamp(fitnessPts + timePts + (a.goals.includes("body") ? 4 : 0));

  // --- SKIN: existing routine + a sunscreen-shaped headroom bump -------------
  const skinBase = { none: 26, basic: 46, regular: 64 }[a.skincare_habit];
  const skin = clamp(skinBase + (a.goals.includes("skin") ? 5 : 0) + timePts / 2);

  // --- STYLE: mostly headroom; budget gives a small options bump -------------
  const budgetPts = { t500: 0, t1500: 4, t5000: 8 }[a.budget_tier];
  const styleBase = 40;
  const style = clamp(styleBase + budgetPts + (a.goals.includes("style") ? 6 : 0));

  // --- MIND: patience is a real asset; deadlines add useful urgency ----------
  const patiencePts = { low: 8, medium: 16, high: 24 }[a.patience];
  const deadlinePts = a.event_deadline === "none" ? 0 : 6;
  const mind = clamp(30 + patiencePts + deadlinePts + (a.goals.includes("mind") ? 5 : 0));

  // --- VOICE: self-reported confidence, gently compressed --------------------
  const voice = clamp(18 + a.speaking_confidence * 6 + (a.goals.includes("voice") ? 4 : 0));

  const total = clamp((body + skin + style + mind + voice) / 5);

  return { body, skin, style, mind, voice, total, version: SCORE_VERSION };
}

/** Top-3 focus areas: lowest scores among the user's chosen goals first. */
export function polishPriorities(score: PolishScore, goals: QuizAnswers["goals"]): string[] {
  const dims: Array<[string, number]> = [
    ["body", score.body],
    ["skin", score.skin],
    ["style", score.style],
    ["mind", score.mind],
    ["voice", score.voice],
  ];
  const chosen = dims.filter(([d]) => goals.includes(d as QuizAnswers["goals"][number]));
  const rest = dims.filter(([d]) => !goals.includes(d as QuizAnswers["goals"][number]));
  return [...chosen.sort((x, y) => x[1] - y[1]), ...rest.sort((x, y) => x[1] - y[1])]
    .slice(0, 3)
    .map(([d]) => d);
}
