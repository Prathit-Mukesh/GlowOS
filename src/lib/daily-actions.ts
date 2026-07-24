import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Blueprint } from "./blueprint-rules";
import { MODULES, type Module } from "./quiz-questions";

/**
 * Daily loop (spec): today's 3 micro-actions come from the user's Blueprint.
 * Generated lazily on first dashboard visit of the day — "no cron-heavy
 * pipelines" is an explicit v1 constraint. Checking one off updates streaks
 * and bumps the Polish Score (see /api/actions/check).
 */

export interface TodayAction {
  id: string;
  module: Module;
  title: string;
  description: string | null;
  evidence: string | null;
  minutes: number;
  done: boolean;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Fetch today's actions, creating them from the latest blueprint if absent. */
export async function ensureTodayActions(
  supabase: SupabaseClient,
  userId: string
): Promise<TodayAction[]> {
  const date = todayUtc();

  const { data: existing } = await supabase
    .from("daily_actions")
    .select("id, module, title, description, evidence, minutes, done")
    .eq("user_id", userId)
    .eq("action_date", date)
    .order("created_at", { ascending: true });

  if (existing && existing.length > 0) return existing as TodayAction[];

  // Nothing for today yet → derive up to 3 actions from the blueprint's
  // weekly plan, keyed by ISO day-of-week (1=Mon..7=Sun).
  const { data: bpRow } = await supabase
    .from("blueprints")
    .select("content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!bpRow) return [];

  const blueprint = bpRow.content as Blueprint;
  const jsDay = new Date().getUTCDay(); // 0=Sun..6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const picked: Array<{ module: Module; title: string; detail: string; evidence: string; minutes: number }> = [];
  for (const m of MODULES) {
    const day = blueprint.modules[m]?.weekly_plan?.find((d) => d.day === isoDay);
    for (const a of day?.actions ?? []) {
      if (picked.length >= 3) break;
      picked.push({
        module: m,
        title: a.title.slice(0, 200),
        detail: a.detail.slice(0, 600),
        evidence: a.evidence,
        minutes: Math.min(a.minutes ?? 5, 60),
      });
    }
    if (picked.length >= 3) break;
  }
  if (picked.length === 0) return [];

  const rows = picked.map((p) => ({
    user_id: userId,
    action_date: date,
    module: p.module,
    title: p.title,
    description: p.detail,
    evidence: p.evidence,
    minutes: p.minutes,
  }));

  const { data: inserted, error } = await supabase
    .from("daily_actions")
    .insert(rows)
    .select("id, module, title, description, evidence, minutes, done");
  if (error) {
    console.error("[daily-actions] insert failed", error);
    return [];
  }
  return (inserted ?? []) as TodayAction[];
}

/** Streak/pet math shared by the check-off route. Pet: 0🥚 1🐣 2🐥 3🐦 4🦚 */
export function petStageFor(streak: number): number {
  if (streak >= 30) return 4;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1;
  return 0;
}
