import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBlueprintSystemPrompt } from "./blueprint-prompt";
import { aiBlueprintSchema, ageGateSchema, type AiBlueprint } from "./blueprint-schema";
import { quizSchema } from "@/lib/validation/quiz";
import { computePolishScore } from "@/lib/polish-score";
import { generateRulesBlueprint, type Blueprint } from "@/lib/blueprint-rules";
import { audit } from "@/lib/audit";

/**
 * AI Blueprint generation (spec §Phase 2 + AI Brain playbook):
 *  - profile data injected as a fenced DATA block (prompt-injection defense
 *    lives in the system prompt; free text was HTML-stripped at intake)
 *  - products filtered to the user's budget tier + goal modules BEFORE
 *    injection (smaller prompt, zero chance of off-budget suggestions)
 *  - AI output is untrusted: Zod-validated, single retry on parse failure,
 *    then the rules-based engine as fallback
 *  - every product_id whitelist-checked against the products table
 *  - token usage logged per user (cost is a security metric)
 *
 * Deviations from the playbook's wiring notes, both forced by API changes:
 *  - `temperature` is not sent — sampling params are removed on current
 *    Claude models and return a 400.
 *  - Server-side refusal fallback is enabled (fallbacks: "default") so a
 *    benign classifier trip re-runs on Anthropic's recommended model instead
 *    of wasting the call; our rules engine remains the final fallback.
 */

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";
const MAX_TOKENS = 4096;

const TIER_ORDER = { t500: 0, t1500: 1, t5000: 2 } as const;

export interface GenerateResult {
  blueprint: Blueprint;
  modelUsed: string;
  engine: "ai" | "rules-fallback";
}

interface ProductRow {
  id: string;
  module: string;
  name: string;
  budget_tier: keyof typeof TIER_ORDER;
  evidence_note: string | null;
}

function extractJson(raw: string): unknown {
  // The prompt demands bare JSON, but strip accidental code fences defensively.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

async function callClaude(
  client: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.Message> {
  const params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages as Anthropic.Beta.BetaMessageParam[],
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
  };
  // `fallbacks` may not be in SDK typings yet — pass through untyped.
  (params as unknown as Record<string, unknown>).fallbacks = "default";
  return (await client.beta.messages.create(params)) as unknown as Anthropic.Message;
}

/**
 * Generate an AI Blueprint for the given user, persist it, and return it.
 * Falls back to the rules engine on any AI failure — the user always gets a
 * plan. Throws only when the user has no quiz data at all.
 */
export async function generateBlueprint(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerateResult> {
  // --- load profile (RLS-scoped) ---------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("quiz_answers, budget_tier, goals, age_confirmed")
    .eq("id", userId)
    .maybeSingle();

  const parsedQuiz = quizSchema.safeParse(profile?.quiz_answers ?? {});
  if (!parsedQuiz.success) {
    throw new Error("no_quiz_data");
  }
  const answers = parsedQuiz.data;
  const score = computePolishScore(answers);
  const rulesFallback = () => generateRulesBlueprint(answers, score);

  // --- curated products, filtered BEFORE injection ---------------------------
  const { data: productRows } = await supabase
    .from("products")
    .select("id, module, name, budget_tier, evidence_note")
    .eq("active", true);

  const userTier = TIER_ORDER[answers.budget_tier];
  const products: ProductRow[] = (productRows ?? []).filter(
    (p: ProductRow) =>
      TIER_ORDER[p.budget_tier] <= userTier && answers.goals.includes(p.module as never)
  );
  const allowedIds = new Set(products.map((p) => p.id));

  // --- missing key → loud log + rules fallback (never brick the product) -----
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "[ai/blueprint] ANTHROPIC_API_KEY not set — serving rules-based blueprint. " +
        "Set the key in server env vars to enable the AI brain."
    );
    return await persist(supabase, userId, rulesFallback(), "rules-v1", "rules-fallback");
  }

  const system = buildBlueprintSystemPrompt(
    { ...answers, age_confirmed: profile?.age_confirmed ?? true },
    products
  );

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Generate my Glow-Up Blueprint now." },
  ];

  let usage = { input: 0, output: 0, calls: 0 };

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callClaude(client, system, messages);
      usage = {
        input: usage.input + (response.usage?.input_tokens ?? 0),
        output: usage.output + (response.usage?.output_tokens ?? 0),
        calls: usage.calls + 1,
      };

      // Safety classifiers can decline (HTTP 200, stop_reason "refusal").
      if (response.stop_reason === "refusal") {
        console.warn("[ai/blueprint] model refusal — serving rules fallback");
        break;
      }

      const text = response.content.find((b) => b.type === "text")?.text ?? "";

      let parsed: unknown;
      let zodError = "";
      try {
        parsed = extractJson(text);
        // Hard rule 7: age gate short-circuit.
        if (ageGateSchema.safeParse(parsed).success) {
          await auditGen(userId, MODEL, usage, "age_gate");
          throw new Error("age_gate");
        }
        const validated = aiBlueprintSchema.safeParse(parsed);
        if (validated.success) {
          const blueprint = toBlueprint(validated.data, allowedIds);
          await auditGen(userId, response.model ?? MODEL, usage, "ok");
          return await persist(supabase, userId, blueprint, response.model ?? MODEL, "ai");
        }
        zodError = JSON.stringify(validated.error.issues.slice(0, 5));
      } catch (err) {
        if (err instanceof Error && err.message === "age_gate") throw err;
        zodError = err instanceof Error ? err.message : "JSON parse failed";
      }

      // Single retry with the validation error appended (per playbook).
      messages.push(
        { role: "assistant", content: text },
        {
          role: "user",
          content: `Your previous output failed JSON validation: ${zodError}. Output only corrected valid JSON.`,
        }
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message === "age_gate") throw err;
    // API errors (rate limit, overload, network) → rules fallback below.
    console.error("[ai/blueprint] API error — serving rules fallback", err);
  }

  await auditGen(userId, MODEL, usage, "fallback");
  return await persist(supabase, userId, rulesFallback(), "rules-v1", "rules-fallback");
}

/** Whitelist product ids + convert the validated AI JSON to our Blueprint shape. */
function toBlueprint(ai: AiBlueprint, allowedIds: Set<string>): Blueprint {
  const clean = (m: AiBlueprint["modules"]["body"]) => ({
    summary: m.summary,
    keystone_habit: m.keystone_habit,
    refer_out: m.refer_out ?? null,
    weekly_plan: Array.from({ length: 7 }, (_, i) => {
      const day = m.weekly_plan.find((d) => d.day === i + 1);
      return {
        day: i + 1,
        actions: (day?.actions ?? []).map((a) => ({
          title: a.title,
          detail: a.detail,
          minutes: a.minutes,
          evidence: a.evidence,
          // Whitelist check: discard any product id not in our table.
          product_id: a.product_id && allowedIds.has(a.product_id) ? a.product_id : null,
        })),
      };
    }),
  });

  return {
    version: "1.0",
    engine: "rules-v1", // field kept for shape-compat; model_used column is authoritative
    user_summary: ai.user_summary,
    polish_priorities: ai.polish_priorities,
    sprint_focus: ai.sprint_focus ?? null,
    modules: {
      body: clean(ai.modules.body),
      skin: clean(ai.modules.skin),
      style: clean(ai.modules.style),
      mind: clean(ai.modules.mind),
      voice: clean(ai.modules.voice),
    },
    week_one_wins: ai.week_one_wins,
    encouragement: ai.encouragement,
  };
}

async function persist(
  supabase: SupabaseClient,
  userId: string,
  blueprint: Blueprint,
  modelUsed: string,
  engine: GenerateResult["engine"]
): Promise<GenerateResult> {
  const { error } = await supabase.from("blueprints").insert({
    user_id: userId,
    version: blueprint.version,
    content: blueprint,
    model_used: modelUsed,
  });
  if (error) {
    console.error("[ai/blueprint] persist failed", error);
    throw new Error("persist_failed");
  }
  return { blueprint, modelUsed, engine };
}

async function auditGen(
  userId: string,
  model: string,
  usage: { input: number; output: number; calls: number },
  outcome: string
) {
  await audit("ai_generation", {
    userId,
    meta: {
      model,
      outcome,
      input_tokens: usage.input,
      output_tokens: usage.output,
      calls: usage.calls,
    },
  });
}
