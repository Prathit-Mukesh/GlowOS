import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODULE_META, MODULES } from "@/lib/quiz-questions";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "Is this really free? What's the catch?",
    a: "No catch. GlowOS is in early access and everything is free while we learn what actually helps people. We don't sell your data, we don't train AI on it, and there's no card to enter.",
  },
  {
    q: "Will you start charging later?",
    a: "Possibly, once the product has earned it. If that day comes we'll tell you clearly and in advance — and anything you've already built (your score, streak and plans) stays yours either way.",
  },
  {
    q: "Do I get the full AI plan, or a cut-down version?",
    a: "The full thing. All five modules, a plan personalised to your goals, budget and daily time, refreshed with AI whenever you want it.",
  },
  {
    q: "What do you actually collect?",
    a: "Your email and your quiz answers — that's it. You can export everything as JSON or hard-delete all of it in one tap from Settings, whenever you like.",
  },
];

/**
 * /pricing — GlowOS is currently free for all (see lib/entitlements).
 * This page says exactly that. It deliberately shows no plan tiers and no
 * checkout: advertising a price we don't charge would be dishonest.
 */
export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-col gap-10 pb-16 pt-8">
      <header className="text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Home
        </Link>
        <span className="chip mt-4 inline-block border-teal/40 text-teal-soft">Early access</span>
        <h1 className="mt-3 text-3xl font-extrabold">
          Everything. <span className="text-teal-soft">Free.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          No plans, no tiers, no card. Every feature is open to everyone while GlowOS is in early
          access.
        </p>
      </header>

      <section className="card border-teal/30">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">What you get</h2>
          <p className="text-3xl font-extrabold text-teal-soft">₹0</p>
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
          <li>✓ The 12-question quiz and your Polish Score</li>
          <li>
            ✓ <strong>All five modules</strong>, fully unlocked —{" "}
            {MODULES.map((m) => MODULE_META[m].label).join(", ")}
          </li>
          <li>✓ An AI-personalised Blueprint built around your goals, budget and time</li>
          <li>✓ Daily micro-actions, streak tracking and your streak pet</li>
          <li>✓ Plan refreshes whenever you want them</li>
          <li>✓ Export or hard-delete all your data, one tap, anytime</li>
        </ul>
        <Link href={user ? "/dashboard" : "/quiz"} className="btn-primary mt-5 w-full">
          {user ? "Go to my dashboard" : "Start free — take the quiz"}
        </Link>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          No payment details required. Ever, while we&apos;re in early access.
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold">Why free?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Because a glow-up plan is only worth charging for once it demonstrably works. We&apos;d
          rather have people using GlowOS daily and telling us what&apos;s broken than a paywall
          protecting an unproven product. If we ever introduce paid plans, you&apos;ll hear it from
          us first — not from a locked screen.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Questions, answered</h2>
        {faqs.map((f) => (
          <details key={f.q} className="card group">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              {f.q}
              <span className="float-right text-violet-soft transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-slate-400">{f.a}</p>
          </details>
        ))}
      </section>

      <p className="text-center text-xs text-slate-600">
        Read our{" "}
        <Link href="/privacy" className="text-violet-soft underline">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-violet-soft underline">
          terms
        </Link>
        .
      </p>
    </main>
  );
}
