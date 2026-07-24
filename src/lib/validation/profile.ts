import { z } from "zod";
import { ageBand, budgetTier, gender, moduleEnum, sanitizeText } from "./quiz";

/**
 * Zod schema for profile updates (/settings). Only fields a user is allowed to
 * change are present; `role` is intentionally absent — it can never be set from
 * the client (RLS also blocks self-promotion server-side).
 */
export const profileUpdateSchema = z
  .object({
    display_name: z
      .string()
      .min(1)
      .max(60)
      .transform((v) => sanitizeText(v, 60))
      .optional(),
    age_band: ageBand.optional(),
    gender: gender.optional(),
    budget_tier: budgetTier.optional(),
    goals: z.array(moduleEnum).max(5).optional(),
  })
  .strict();

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** Age-gate payload recorded at signup (18+, with timestamp). */
export const ageGateSchema = z
  .object({
    age_confirmed: z.literal(true, {
      errorMap: () => ({ message: "You must confirm you are 18 or older." }),
    }),
  })
  .strict();
