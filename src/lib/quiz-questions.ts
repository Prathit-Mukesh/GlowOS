/**
 * The 12-question onboarding quiz. This is the single source of truth for both
 * the UI (src/app/quiz) and the Zod validator (src/lib/validation/quiz.ts).
 * Keep option `value`s in sync with the Zod enums.
 */

export type QuestionKind = "single" | "multi" | "scale" | "text";

export interface QuizOption {
  value: string;
  label: string;
  hint?: string;
}

export interface QuizQuestion {
  key: string;
  kind: QuestionKind;
  title: string;
  subtitle?: string;
  options?: QuizOption[];
  min?: number;
  max?: number;
  maxLength?: number;
  optional?: boolean;
}

export const MODULES = ["body", "skin", "style", "mind", "voice"] as const;
export type Module = (typeof MODULES)[number];

export const MODULE_META: Record<Module, { label: string; emoji: string; blurb: string }> = {
  body: { label: "Body", emoji: "💪", blurb: "Movement, posture, energy" },
  skin: { label: "Skin & Groom", emoji: "✨", blurb: "Skincare, grooming basics" },
  style: { label: "Style", emoji: "👕", blurb: "Fit, colour, put-together" },
  mind: { label: "Mind", emoji: "🧠", blurb: "Focus, calm, sleep" },
  voice: { label: "Voice", emoji: "🎙️", blurb: "Speaking, presence" },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "age_band",
    kind: "single",
    title: "Which age group are you in?",
    subtitle: "GlowOS is for adults 18 and over.",
    options: [
      { value: "18-24", label: "18–24" },
      { value: "25-34", label: "25–34" },
      { value: "35-44", label: "35–44" },
      { value: "45+", label: "45 and over" },
    ],
  },
  {
    key: "gender",
    kind: "single",
    title: "How do you present?",
    subtitle: "This tailors grooming and style tips. No judgement here.",
    options: [
      { value: "woman", label: "Woman" },
      { value: "man", label: "Man" },
      { value: "nonbinary", label: "Non-binary" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    key: "goals",
    kind: "multi",
    title: "What do you most want to work on?",
    subtitle: "Pick everything that matters to you.",
    options: MODULES.map((m) => ({ value: m, label: MODULE_META[m].label, hint: MODULE_META[m].blurb })),
  },
  {
    key: "budget_tier",
    kind: "single",
    title: "Monthly budget for this glow-up?",
    subtitle: "We only ever suggest things inside your budget.",
    options: [
      { value: "t500", label: "Up to ₹500", hint: "Mostly free habits" },
      { value: "t1500", label: "Around ₹1,500", hint: "A few basics" },
      { value: "t5000", label: "₹5,000+", hint: "Room for gear" },
    ],
  },
  {
    key: "time_per_day",
    kind: "single",
    title: "How much time can you give each day?",
    subtitle: "Be honest — we build the whole plan to fit this.",
    options: [
      { value: "10", label: "10 minutes" },
      { value: "15", label: "15 minutes" },
      { value: "30", label: "30 minutes" },
      { value: "45", label: "45+ minutes" },
    ],
  },
  {
    key: "diet",
    kind: "single",
    title: "How do you eat?",
    options: [
      { value: "veg", label: "Vegetarian" },
      { value: "nonveg", label: "Non-vegetarian" },
      { value: "eggetarian", label: "Eggetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "jain", label: "Jain" },
    ],
  },
  {
    key: "fitness_level",
    kind: "single",
    title: "How active are you right now?",
    options: [
      { value: "sedentary", label: "Barely move", hint: "Mostly sitting" },
      { value: "light", label: "A little", hint: "Occasional walks" },
      { value: "moderate", label: "Fairly active", hint: "Exercise sometimes" },
      { value: "active", label: "Very active", hint: "Train regularly" },
    ],
  },
  {
    key: "skincare_habit",
    kind: "single",
    title: "Your current skincare routine?",
    options: [
      { value: "none", label: "None yet" },
      { value: "basic", label: "Wash + maybe moisturiser" },
      { value: "regular", label: "A proper routine" },
    ],
  },
  {
    key: "speaking_confidence",
    kind: "scale",
    title: "How confident are you speaking to people?",
    subtitle: "1 = terrified, 10 = totally at ease.",
    min: 1,
    max: 10,
  },
  {
    key: "patience",
    kind: "single",
    title: "How do you like to make progress?",
    options: [
      { value: "low", label: "Fast wins", hint: "I need to see change quickly" },
      { value: "medium", label: "Steady", hint: "A balanced pace" },
      { value: "high", label: "Slow and deep", hint: "I'm in no rush" },
    ],
  },
  {
    key: "event_deadline",
    kind: "single",
    title: "Anything big coming up?",
    subtitle: "We'll count down to it if so.",
    options: [
      { value: "none", label: "Nothing specific" },
      { value: "interview", label: "An interview" },
      { value: "wedding", label: "A wedding / big event" },
    ],
  },
  {
    key: "insecurity",
    kind: "text",
    title: "Anything you'd love to feel better about?",
    subtitle: "Totally optional, and only you ever see it.",
    maxLength: 200,
    optional: true,
  },
];
