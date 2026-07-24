import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <section>
        <h2>The short version</h2>
        <p>
          GlowOS gives you educational self-improvement plans. It is not medical care, you must be
          18+, be kind to the service, and you can leave (and take or delete your data) whenever you
          want.
        </p>
      </section>

      <section>
        <h2>1. Who can use GlowOS</h2>
        <p>
          You must be 18 years or older. You confirm this at signup. If we learn an account belongs
          to someone under 18, we will delete it.
        </p>
      </section>

      <section>
        <h2>2. Educational, not medical</h2>
        <p>
          GlowOS provides general wellness, grooming, style, mindset and speaking guidance. It is
          not a doctor, dermatologist, dietitian or therapist, and it never diagnoses anything.
          Where our content suggests seeing a professional, please take that seriously. Always
          consult a qualified professional for medical concerns.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>Sign-in is passwordless (email link or Google). Keep access to your email secure.</li>
          <li>You’re responsible for what happens under your account.</li>
          <li>One account per person; don’t share or resell access.</li>
        </ul>
      </section>

      <section>
        <h2>4. Subscriptions & billing</h2>
        <ul>
          <li>Glow Pass: ₹199/month or ₹1,499/year. One-time Blueprint: ₹499. Prices include applicable taxes unless stated.</li>
          <li>Payments are processed by Razorpay. Subscriptions renew automatically until cancelled in Settings.</li>
          <li>Refunds are covered by our <a href="/refunds" className="text-violet-soft underline">Refund Policy</a>.</li>
        </ul>
      </section>

      <section>
        <h2>5. Fair use</h2>
        <ul>
          <li>Don’t attempt to break, probe, overload or reverse-engineer the service.</li>
          <li>Don’t use GlowOS to generate content that harms others.</li>
          <li>We rate-limit and may suspend accounts that abuse the platform.</li>
        </ul>
      </section>

      <section>
        <h2>6. Your content & data</h2>
        <p>
          Your quiz answers, notes and voice clips remain yours. You grant us only the licence
          needed to run the product for you. See the{" "}
          <a href="/privacy" className="text-violet-soft underline">Privacy Policy</a> for deletion
          and export rights.
        </p>
      </section>

      <section>
        <h2>7. Liability</h2>
        <p>
          GlowOS is provided “as is”. To the maximum extent allowed by law, our liability is limited
          to the amount you paid us in the last 12 months. Nothing in these terms limits liability
          that cannot legally be limited.
        </p>
      </section>

      <section>
        <h2>8. Changes & contact</h2>
        <p>
          We may update these terms; material changes will be announced in-app. Questions:{" "}
          <a href="mailto:hello@glowos.app" className="text-violet-soft underline">hello@glowos.app</a>.
          These terms are governed by the laws of India.
        </p>
      </section>
    </LegalPage>
  );
}
