import type { QuizAnswers } from "./validation/quiz";
import type { PolishScore } from "./polish-score";
import { polishPriorities } from "./polish-score";
import { MODULES, type Module } from "./quiz-questions";

/**
 * Rules-based Blueprint — Phase 1's plan engine and the permanent fallback for
 * the Phase 2 AI brain. Output shape mirrors the AI Blueprint JSON schema so
 * the UI never cares which engine produced it.
 *
 * Safety rails baked in: educational-not-medical tone, no diagnosis, no
 * appearance judgement, actions ≤10 minutes, budget respected, ≤3 actions/day
 * across ALL modules combined.
 */

export interface BlueprintAction {
  title: string;
  detail: string;
  minutes: number;
  evidence: "strong" | "moderate" | "practical";
  product_id: string | null;
}

export interface BlueprintDay {
  day: number;
  actions: BlueprintAction[];
}

export interface BlueprintModule {
  summary: string;
  keystone_habit: string;
  weekly_plan: BlueprintDay[];
  refer_out: string | null;
}

export interface Blueprint {
  version: "1.0";
  engine: "rules-v1";
  user_summary: string;
  polish_priorities: string[];
  sprint_focus: string | null;
  modules: Record<Module, BlueprintModule>;
  week_one_wins: string[];
  encouragement: string;
}

type ActionDef = BlueprintAction & { sameDayWin?: boolean };

// --- The rules table: per-module action pools, cheapest-first ----------------
const POOLS: Record<Module, { keystone: string; summary: string; actions: ActionDef[] }> = {
  body: {
    keystone: "A 5-minute movement snack every day — same time, no exceptions.",
    summary:
      "We start tiny on purpose. Daily movement you actually do beats a gym plan you dread. Strength and posture first — both show fast.",
    actions: [
      { title: "Posture reset", detail: "Stand tall against a wall: heels, hips, shoulders, head touching. Hold 2 minutes. Feel the difference instantly.", minutes: 2, evidence: "practical", product_id: null, sameDayWin: true },
      { title: "Drink a full glass of water on waking", detail: "Before tea or your phone. Rehydrates you and kick-starts the day.", minutes: 1, evidence: "moderate", product_id: null, sameDayWin: true },
      { title: "5-minute walk after your biggest meal", detail: "Helps digestion and steadies energy. Just around the block.", minutes: 5, evidence: "strong", product_id: null },
      { title: "10 slow bodyweight squats", detail: "Slow down, 3 seconds each way. Strength is the highest-evidence glow habit there is.", minutes: 3, evidence: "strong", product_id: null },
      { title: "Wall push-ups × 10", detail: "Hands on the wall, body straight. Too easy? Move feet back a step.", minutes: 3, evidence: "strong", product_id: null },
      { title: "Stretch before bed", detail: "Neck rolls, shoulder circles, touch your toes. Signals your body it's wind-down time.", minutes: 4, evidence: "moderate", product_id: null },
    ],
  },
  skin: {
    keystone: "Sunscreen every single morning — rain, shine, or indoors near windows.",
    summary:
      "Skin rewards boring consistency. Cleanse, moisturise, protect — that's 90% of every good routine. We keep it simple and inside your budget.",
    actions: [
      { title: "Morning face wash + moisturiser", detail: "Gentle cleanser, pat dry, moisturise while skin is damp. Two minutes, done.", minutes: 2, evidence: "strong", product_id: null, sameDayWin: true },
      { title: "Apply sunscreen", detail: "Two-finger amount for the face. The single best-evidenced skin habit in existence.", minutes: 1, evidence: "strong", product_id: null },
      { title: "Grooming reset", detail: "Trim nails, tidy eyebrows or facial hair edges, clean your glasses. Instantly sharper.", minutes: 8, evidence: "practical", product_id: null, sameDayWin: true },
      { title: "Change your pillowcase", detail: "Fresh pillowcase twice a week. Less oil and friction on your face all night.", minutes: 2, evidence: "moderate", product_id: null },
      { title: "Night-time face wash", detail: "Wash the day off before bed — especially if you've been outside.", minutes: 2, evidence: "strong", product_id: null },
    ],
  },
  style: {
    keystone: "Clothes that fit — one honest fit-check of everything you wear this week.",
    summary:
      "Style isn't about money. Fit, cleanliness, and repetition of what works beat any shopping spree. We build your uniform.",
    actions: [
      { title: "Steam or iron tomorrow's outfit tonight", detail: "Crisp beats expensive. Lay it out so morning-you has zero decisions.", minutes: 5, evidence: "practical", product_id: null, sameDayWin: true },
      { title: "Fit check in the mirror", detail: "Shoulders seam at your shoulder edge? Trousers not pooling? Note one fix.", minutes: 3, evidence: "practical", product_id: null },
      { title: "Clean your shoes", detail: "People notice shoes more than you think. Two minutes with a damp cloth.", minutes: 3, evidence: "practical", product_id: null, sameDayWin: true },
      { title: "Pick your 3 best-fitting outfits", detail: "Photograph them. That's your capsule — repeat with pride.", minutes: 8, evidence: "practical", product_id: null },
      { title: "Declutter 3 items you never wear", detail: "Less choice, better mornings. Donate what doesn't fit your life.", minutes: 6, evidence: "practical", product_id: null },
    ],
  },
  mind: {
    keystone: "A fixed lights-out time — sleep is the engine behind every other module.",
    summary:
      "Calm and focus are trainable. Small daily reps — breathing, journaling, a real wind-down — compound faster than you'd expect.",
    actions: [
      { title: "60-second breathing reset", detail: "Inhale 4, hold 4, exhale 6 — ten rounds. Use it before anything stressful.", minutes: 2, evidence: "moderate", product_id: null, sameDayWin: true },
      { title: "Write tomorrow's top task", detail: "One line, tonight. Your morning starts decided instead of scattered.", minutes: 2, evidence: "practical", product_id: null },
      { title: "Phone outside arm's reach for 30 minutes", detail: "One focused block. Notice how much longer 30 minutes feels.", minutes: 1, evidence: "moderate", product_id: null },
      { title: "3-line gratitude note", detail: "Three specific things from today. Specific beats generic.", minutes: 3, evidence: "moderate", product_id: null },
      { title: "Set a wind-down alarm", detail: "An alarm 45 minutes before lights-out. When it rings, screens dim.", minutes: 1, evidence: "strong", product_id: null },
    ],
  },
  voice: {
    keystone: "Read one paragraph aloud daily, slower than feels natural.",
    summary:
      "A clear, steady voice is a skill, not a gift. Tiny daily drills — reading aloud, pausing on purpose — change how you sound in weeks.",
    actions: [
      { title: "Read a paragraph aloud, slowly", detail: "Any book or article. Half your normal speed. Record it if you dare.", minutes: 3, evidence: "practical", product_id: null, sameDayWin: true },
      { title: "The pause drill", detail: "In one conversation today, pause a full second before answering. Feels long, sounds confident.", minutes: 1, evidence: "practical", product_id: null },
      { title: "Hum warm-up", detail: "Hum a tune for 2 minutes in the shower. Wakes up your resonance.", minutes: 2, evidence: "practical", product_id: null },
      { title: "Say your name and one line in the mirror", detail: "\"Hi, I'm ___. Nice to meet you.\" Shoulders back, eye contact with yourself.", minutes: 2, evidence: "practical", product_id: null },
      { title: "Swap one filler word", detail: "Catch one 'um' or 'like' today and replace it with silence.", minutes: 1, evidence: "practical", product_id: null },
    ],
  },
};

/** Total daily minutes budget from the quiz answer. */
function minutesBudget(a: QuizAnswers): number {
  return { "10": 10, "15": 15, "30": 30, "45": 45 }[a.time_per_day];
}

/**
 * Build the weekly plan. Global constraint: ≤3 actions/day TOTAL across all
 * modules, and the summed minutes fit the user's stated time budget.
 * Priority modules get the most slots; non-goal modules get rest days.
 */
export function generateRulesBlueprint(a: QuizAnswers, score: PolishScore): Blueprint {
  const priorities = polishPriorities(score, a.goals) as Module[];
  const budget = minutesBudget(a);

  // Rotation: priority modules appear most days; others 1–2 times a week.
  const emptyWeek = (): BlueprintDay[] =>
    Array.from({ length: 7 }, (_, i) => ({ day: i + 1, actions: [] }));

  const modulesOut = Object.fromEntries(
    MODULES.map((m) => [
      m,
      {
        summary: POOLS[m].summary,
        keystone_habit: POOLS[m].keystone,
        weekly_plan: emptyWeek(),
        refer_out: null,
      } satisfies BlueprintModule,
    ])
  ) as Record<Module, BlueprintModule>;

  // Fill each day with up to 3 actions, cycling module priority, respecting time.
  for (let day = 1; day <= 7; day++) {
    let used = 0;
    let placed = 0;
    // day-offset rotation so the week doesn't repeat identically
    const order: Module[] = [...priorities, ...MODULES.filter((m) => !priorities.includes(m))];
    for (let k = 0; k < order.length && placed < 3; k++) {
      const m = order[(k + day - 1) % order.length]!;
      // Non-goal modules only contribute on days 6/7 (taster actions).
      const isGoal = a.goals.includes(m);
      if (!isGoal && day < 6) continue;
      const pool = POOLS[m].actions;
      const action = pool[(day - 1 + k) % pool.length]!;
      if (used + action.minutes > budget) continue;
      modulesOut[m].weekly_plan[day - 1]!.actions.push({
        title: action.title,
        detail: action.detail,
        minutes: action.minutes,
        evidence: action.evidence,
        product_id: action.product_id,
      });
      used += action.minutes;
      placed += 1;
    }
  }

  // Week-one wins: same-day-visible actions drawn from priority pools.
  const wins: string[] = [];
  for (const m of priorities) {
    for (const act of POOLS[m].actions) {
      if (act.sameDayWin && wins.length < 3) wins.push(act.title);
    }
  }
  while (wins.length < 3) wins.push(POOLS.mind.actions[0]!.title);

  const sprint =
    a.event_deadline === "none"
      ? null
      : a.event_deadline === "interview"
        ? "Interview sprint: weeks lead with voice drills and one crisp go-to outfit; mind resets daily so you walk in calm."
        : "Event sprint: skin consistency and outfit lock-in early, energy and posture work up front, calm-downs the final week.";

  const goalsLabel = priorities
    .map((m) => ({ body: "body", skin: "skin", style: "style", mind: "mind", voice: "voice" })[m])
    .join(", ");

  return {
    version: "1.0",
    engine: "rules-v1",
    user_summary: `You told us where you want to grow — ${goalsLabel} first — and how much time you really have (${budget} minutes a day). This plan fits that exactly: small actions, checked off daily, compounding fast.`,
    polish_priorities: priorities,
    sprint_focus: sprint,
    modules: modulesOut,
    week_one_wins: wins.slice(0, 3),
    encouragement:
      "You don't need a new you — you need seven honest days of the plan you just unlocked. Start with today's first tick.",
  };
}
