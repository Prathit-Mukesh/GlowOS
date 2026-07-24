import { z } from "zod";

/**
 * Zod schema for quiz submission. This is the trust boundary: every field is
 * constrained, strings are length-capped, and unknown keys are stripped. The
 * free-text `insecurity` field is HTML-stripped here (see sanitizeText) — it is
 * the one place user prose enters the system and later reaches the LLM, so it is
 * treated as hostile.
 */

// Strip angle-bracket tags and control chars; collapse whitespace; hard-cap.
export function sanitizeText(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, "") // remove any HTML tags
    .replace(/[\u0000-\u001f\u007f]/g, " ") // strip control chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export const ageBand = z.enum(["18-24", "25-34", "35-44", "45+"]);
export const gender = z.enum(["woman", "man", "nonbinary", "prefer_not"]);
export const budgetTier = z.enum(["t500", "t1500", "t5000"]);
export const moduleEnum = z.enum(["body", "skin", "style", "mind", "voice"]);
export const timePerDay = z.enum(["10", "15", "30", "45"]);
export const diet = z.enum(["veg", "nonveg", "eggetarian", "vegan", "jain"]);
export const fitnessLevel = z.enum(["sedentary", "light", "moderate", "active"]);
export const skincareHabit = z.enum(["none", "basic", "regular"]);
export const patience = z.enum(["low", "medium", "high"]);
export const eventDeadline = z.enum(["none", "interview", "wedding"]);

export const quizSchema = z
  .object({
    age_band: ageBand,
    gender: gender,
    goals: z.array(moduleEnum).min(1, "Pick at least one focus area").max(5),
    budget_tier: budgetTier,
    time_per_day: timePerDay,
    diet: diet,
    fitness_level: fitnessLevel,
    skincare_habit: skincareHabit,
    speaking_confidence: z.coerce.number().int().min(1).max(10),
    patience: patience,
    event_deadline: eventDeadline,
    insecurity: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v ? sanitizeText(v, 200) : undefined)),
  })
  .strict(); // reject unexpected keys outright

export type QuizAnswers = z.infer<typeof quizSchema>;
