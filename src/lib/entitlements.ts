import type { SupabaseClient } from "@supabase/supabase-js";
import { MODULES, type Module } from "./quiz-questions";

/**
 * ENTITLEMENTS — the single source of truth for who can see what.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ GlowOS is currently FREE FOR ALL. Every signed-in user gets every    │
 * │ module and a full AI-personalised plan, at no cost.                  │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * To reintroduce paid tiers later, flip FREE_FOR_ALL to false. Every gate in
 * the app reads through this file, so nothing else needs editing — and the
 * subscription-reading code below is kept intact and exercised for exactly
 * that reason (it still reports real subscription state; it just doesn't
 * restrict anything while the flag is on).
 *
 * SECURITY NOTE: entitlement is still decided SERVER-SIDE from the database,
 * never from a client claim or URL parameter (spec §6). Making the product
 * free widens who is allowed in; it does not move the decision to the client.
 */
export const FREE_FOR_ALL = true;

export interface Entitlement {
  /** Full access to all five modules and AI plans. */
  hasFullAccess: boolean;
  /** Modules this user may open. */
  unlockedModules: Module[];
  /** True when access comes from a real paid subscription (not the free flag). */
  isSubscriber: boolean;
}

/**
 * Resolve what a user is entitled to. Reads the subscriptions table so admin
 * reporting stays accurate, then applies the free-for-all flag on top.
 */
export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<Entitlement> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const isSubscriber =
    !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  const hasFullAccess = FREE_FOR_ALL || isSubscriber;

  return {
    hasFullAccess,
    isSubscriber,
    unlockedModules: hasFullAccess ? [...MODULES] : [],
  };
}

/**
 * Entitlement for a module list when we already know access status — used by
 * pages that resolved it once and pass it down.
 */
export function unlockedFor(hasFullAccess: boolean, topPriority?: Module): Module[] {
  if (hasFullAccess) return [...MODULES];
  return topPriority ? [topPriority] : [];
}
