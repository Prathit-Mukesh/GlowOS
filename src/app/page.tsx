import Link from "next/link";
import { MODULE_META, MODULES } from "@/lib/quiz-questions";

const steps = [
  {
    n: "1",
    title: "Take the 2-minute quiz",
    body: "Twelve quick questions about your goals, time, and budget. No account needed to start.",
  },
  {
    n: "2",
    title: "See your Polish Score",
    body: "Five dimensions — Body, Skin, Style, Mind, Voice — scored on habits and readiness, never looks.",
  },
  {
    n: "3",
    title: "Follow 3 tiny actions a day",
    body: "Your Blueprint breaks the glow-up into checkable, sub-10-minute actions that fit your real day.",
  },
];

const faqs = [
  {
    q: "Is this medical advice?",
    a: "No. GlowOS is educational, never medical. Where something needs a professional — a dermatologist, doctor, or therapist — we say so clearly and point you to one.",
  },
  {
    q: "Does GlowOS judge how I look?",
    a: "Never. Your Polish Score measures habits, consistency and progress. It never rates your face or body, and it never compares you to anyone.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. GlowOS is completely free while we're in early access — all five modules, your full AI plan, no card required. If we ever add paid plans, we'll tell you first.",
  },
  {
    q: "What happens to my data?",
    a: "It stays yours. We collect the minimum, never sell it, never train AI on it, and you can export or hard-delete everything with one tap in Settings.",
  },
  {
    q: "Do I need special products or a gym?",
    a: "No. Every plan is built inside the budget you choose — including the ₹0-extra tier. Most week-one actions are completely free.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-col gap-16 pb-16 pt-10">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="chip border-violet/40 text-violet-soft">GlowOS · early access</span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
          Your AI <span className="text-violet-soft">Glow-Up</span> Engine
        </h1>
        <p className="max-w-sm text-slate-300">
          A personal polish system across <strong>Body, Skin, Style, Mind & Voice</strong> — built
          around your time, your budget, your life. Kind, science-aware, zero shame.
        </p>
        <div className="flex w-full flex-col gap-3">
          <Link href="/quiz" className="btn-primary w-full text-lg">
            Get my Polish Score →
          </Link>
          <Link href="/auth" className="btn-ghost w-full">
            I already have an account
          </Link>
        </div>
        <p className="text-xs text-slate-500">Free 2-minute quiz · no signup needed to start</p>
      </section>

      {/* Modules strip */}
      <section className="grid grid-cols-5 gap-2 text-center">
        {MODULES.map((m) => (
          <div key={m} className="card flex flex-col items-center gap-1 !p-3">
            <span className="text-xl" aria-hidden>
              {MODULE_META[m].emoji}
            </span>
            <span className="text-[11px] font-medium text-slate-300">{MODULE_META[m].label}</span>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">How it works</h2>
        {steps.map((s) => (
          <div key={s.n} className="card flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet/20 font-bold text-violet-soft">
              {s.n}
            </div>
            <div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing — free for all during early access */}
      <section className="flex flex-col gap-4" id="pricing">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Pricing</h2>
          <Link href="/pricing" className="text-xs font-semibold text-violet-soft">
            Details →
          </Link>
        </div>
        <div className="card border-teal/40 text-center">
          <span className="chip border-teal/40 text-teal-soft">Early access</span>
          <p className="mt-3 text-4xl font-extrabold text-teal-soft">Free</p>
          <p className="mt-2 text-sm text-slate-300">
            All five modules, your full AI plan, daily actions and streaks — open to everyone, no
            card required.
          </p>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Early glow-ups</h2>
        <div className="card text-sm italic text-slate-400">
          “Testimonials coming soon — we’re in early access. Be one of the first stories here.”
        </div>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Questions, answered</h2>
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

      {/* Footer */}
      <footer className="mt-4 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
        <nav className="mb-3 flex justify-center gap-5">
          <Link href="/pricing" className="hover:text-slate-300">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-slate-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-300">
            Terms
          </Link>
          <Link href="/refunds" className="hover:text-slate-300">
            Refunds
          </Link>
          <a href="mailto:hello@glowos.app" className="hover:text-slate-300">
            Contact
          </a>
        </nav>
        <p>GlowOS is educational, not medical. For adults 18+. © {new Date().getFullYear()} GlowOS.</p>
      </footer>
    </main>
  );
}
