import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" updated="July 2026">
      <section>
        <h2>There is nothing to refund — GlowOS is free</h2>
        <p>
          GlowOS is currently free for everyone. We have no paid plans, take no payments, and do not
          collect card or UPI details. So there are no charges to refund, and nothing to cancel.
        </p>
      </section>

      <section>
        <h2>If you want to stop using GlowOS</h2>
        <p>
          Just go to <strong>Settings</strong> and tap <strong>Delete my data</strong>. That erases
          your profile, quiz answers, plans, scores and streaks permanently, and closes your
          account. You can also export everything as a JSON file first if you want a copy.
        </p>
      </section>

      <section>
        <h2>If we introduce paid plans later</h2>
        <p>
          This page will be replaced with a real refund policy before any charge is ever taken, and
          we will announce the change in advance. No existing account will be charged without
          explicit consent.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          Email{" "}
          <a href="mailto:hello@glowos.app" className="text-violet-soft underline">
            hello@glowos.app
          </a>{" "}
          and we&apos;ll get back to you.
        </p>
      </section>
    </LegalPage>
  );
}
