import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        GlowOS is a trust product. This page says, in plain language, exactly what we collect, why,
        and what your rights are — as required by India’s Digital Personal Data Protection (DPDP)
        Act.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your email (to sign you in — we never store passwords).</li>
          <li>Your quiz answers: age band, presentation, goals, budget tier, daily time, diet, fitness level, skincare habit, speaking confidence, patience, upcoming event, and an optional short note.</li>
          <li>Your plans, scores, streaks and check-ins as you use the app.</li>
          <li>Voice clips, only if you use the Voice module — kept a maximum of 30 days.</li>
          <li>Nothing about payments — GlowOS is free, so we collect no card or UPI details at all.</li>
        </ul>
        <p>That’s the whole list. We collect nothing else, and we add nothing without a reason.</p>
      </section>

      <section>
        <h2>What we never do</h2>
        <ul>
          <li>We never sell your data. To anyone. Ever.</li>
          <li>We never train AI models on your data.</li>
          <li>We never rate or comment on your appearance — the product measures habits.</li>
          <li>We never store your raw IP address long-term (security logs keep only a salted hash).</li>
        </ul>
      </section>

      <section>
        <h2>Your rights & controls</h2>
        <ul>
          <li><strong>Delete my data</strong> — one tap in Settings hard-deletes every row and file we hold about you, immediately, with email confirmation.</li>
          <li><strong>Export my data</strong> — one tap gives you everything as a JSON file.</li>
          <li>Consent is asked at signup, and you can withdraw it by deleting your account at any time.</li>
        </ul>
      </section>

      <section>
        <h2>Where your data lives</h2>
        <p>
          Data is stored with Supabase (Postgres) with row-level security so your rows are readable
          by you alone, and processed by our hosting (Vercel) and AI provider (Anthropic) strictly
          to run the product. Voice files sit in a private bucket and are auto-deleted after 30
          days.
        </p>
      </section>

      <section>
        <h2>If something goes wrong</h2>
        <p>
          If a breach ever affects your data, we will notify you and the relevant authorities
          promptly, explain what happened in plain language, and say exactly what we’re doing about
          it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions or requests: <a href="mailto:privacy@glowos.app" className="text-violet-soft underline">privacy@glowos.app</a>
        </p>
      </section>
    </LegalPage>
  );
}
