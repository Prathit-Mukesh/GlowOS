import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel whenever you like and you keep access until the end of the period you've paid for. No cancellation fee, no exit survey.",
  },
  {
    q: "What happens to my plan if I don't pay?",
    a: "Nothing you've built disappears. You keep your Polish Score, your streak and one full module — you just lose access to the other four.",
  },
  {
    q: "Is the free tier a trial?",
    a: "No, it's free forever. The quiz, your Polish Score and one full module never expire.",
  },
];

/**
 * /pricing — the real pricing page (the landing page's #pricing block is a
 * teaser). Checkout buttons activate when Razorpay lands in the payments
 * update; until then they route to a clearly-labelled waitlist state rather
 * than pretending to charge.
 */
export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = user
    ? await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
    : { data: null };

  const isPaid = !!sub;

  return (
    <main className="flex flex-col gap-10 pb-16 pt-8">
      <header className="text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Simple, honest pricing</h1>
        <p className="mt-2 text-sm text-slate-400">
          Start free. Upgrade only if the daily loop is working for you.
        </p>
      </header>

      {isPaid ? (
        <div className="card border-teal/40 text-center">
          <p className="text-2xl" aria-hidden>
            ✨
          </p>
          <p className="mt-1 font-bold text-teal-soft">You&apos;re on Glow Pass</p>
          <p className="mt-1 text-sm text-slate-400">All five modules are unlocked. Thank you.</p>
          <Link href="/settings" className="btn-ghost mt-3 w-full text-sm">
            Manage subscription
          </Link>
        </div>
      ) : null}

      {/* Free */}
      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Free</h2>
          <p className="text-2xl font-extrabold">₹0</p>
        </div>
        <p className="mt-1 text-sm text-slate-400">Forever. No card, no trial timer.</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-300">
          <li>✓ The 12-question quiz &amp; your Polish Score</li>
          <li>✓ One full module, fully unlocked</li>
          <li>✓ Daily actions, streak &amp; streak pet</li>
          <li>✓ Export or delete your data anytime</li>
        </ul>
        <Link href={user ? "/dashboard" : "/quiz"} className="btn-ghost mt-4 w-full">
          {user ? "Go to dashboard" : "Start free"}
        </Link>
      </section>

      {/* Glow Pass */}
      <section className="card border-violet/50">
        <span className="chip border-violet/40 text-violet-soft">Most popular</span>
        <div className="mt-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Glow Pass</h2>
          <p className="text-right">
            <span className="text-3xl font-extrabold text-gold-soft">₹199</span>
            <span className="text-sm text-slate-400">/mo</span>
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          or <strong className="text-slate-200">₹1,499/year</strong> — save 37%
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-300">
          <li>✓ <strong>All five modules</strong> — Body, Skin, Style, Mind, Voice</li>
          <li>✓ Plans refreshed weekly by the AI coach</li>
          <li>✓ Voice recording &amp; speaking analysis</li>
          <li>✓ Weekly recap cards</li>
          <li>✓ Everything in Free</li>
        </ul>
        <button
          disabled
          className="btn-primary mt-4 w-full disabled:opacity-60"
          aria-describedby="checkout-note"
        >
          Checkout opening soon
        </button>
        <p id="checkout-note" className="mt-2 text-center text-[11px] text-slate-500">
          UPI &amp; card checkout goes live with our payments update. Your free plan keeps working.
        </p>
      </section>

      {/* One-time Blueprint */}
      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">One-time Blueprint</h2>
          <p className="text-2xl font-extrabold text-gold-soft">₹499</p>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Your full five-module Blueprint, once — yours to keep. No subscription.
        </p>
        <button disabled className="btn-ghost mt-4 w-full disabled:opacity-60">
          Checkout opening soon
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Before you ask</h2>
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
        Prices in INR, taxes included where applicable. See our{" "}
        <Link href="/refunds" className="text-violet-soft underline">
          refund policy
        </Link>
        .
      </p>
    </main>
  );
}
