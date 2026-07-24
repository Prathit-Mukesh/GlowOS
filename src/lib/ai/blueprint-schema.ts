import { z } from "zod";

/**
 * Zod schema for the AI Blueprint JSON — the AI's output is UNTRUSTED INPUT
 * (spec §4). Everything is length-capped; unknown keys are stripped; product
 * ids are whitelist-checked afterwards against the products table.
 */

const aiAction = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(500),
  minutes: z.coerce.number().int().min(0).max(10),
  evidence: z.enum(["strong", "moderate", "practical"]),
  product_id: z.string().max(64).nullable().optional().default(null),
});

const aiDay = z.object({
  day: z.coerce.number().int().min(1).max(7),
  actions: z.array(aiAction).max(3).default([]),
});

const aiModule = z.object({
  summary: z.string().min(1).max(800),
  keystone_habit: z.string().min(1).max(300),
  weekly_plan: z.array(aiDay).min(1).max(7),
  refer_out: z.string().max(80).nullable().optional().default(null),
});

export const aiBlueprintSchema = z.object({
  version: z.string().max(10).default("1.0"),
  user_summary: z.string().min(1).max(800),
  polish_priorities: z.array(z.string().max(40)).min(1).max(3),
  sprint_focus: z.string().max(500).nullable().optional().default(null),
  modules: z.object({
    body: aiModule,
    skin: aiModule,
    style: aiModule,
    mind: aiModule,
    voice: aiModule,
  }),
  week_one_wins: z.array(z.string().max(200)).min(1).max(3),
  encouragement: z.string().min(1).max(400),
});

/** The 18+ hard-rule error shape: {"error": "age_gate"} and nothing else. */
export const ageGateSchema = z.object({ error: z.literal("age_gate") }).strict();

export type AiBlueprint = z.infer<typeof aiBlueprintSchema>;
