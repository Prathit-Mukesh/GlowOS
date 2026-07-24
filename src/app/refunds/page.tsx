import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" updated="July 2026">
      <section>
        <h2>The short version</h2>
        <p>
          If GlowOS isn’t right for you, we’d rather refund you than have you feel stuck. Here’s
          exactly how it works.
        </p>
      </section>

      <section>
        <h2>Monthly Glow Pass (₹199/mo)</h2>
        <ul>
          <li>Cancel anytime in Settings — access continues to the end of the paid month, then simply doesn’t renew.</li>
          <li>First-time subscribers: full refund if you ask within 7 days of your first charge.</li>
        </ul>
      </section>

      <section>
        <h2>Yearly Glow Pass (₹1,499/yr)</h2>
        <ul>
          <li>Full refund within 14 days of the charge, no questions asked.</li>
          <li>After 14 days: pro-rated refund for the unused full months, minus payment-gateway fees.</li>
        </ul>
      </section>

      <section>
        <h2>One-time Blueprint (₹499)</h2>
        <p>
          Refundable within 48 hours of purchase if you haven’t downloaded/exported it. Because it’s
          delivered instantly and personalised to you, it’s non-refundable after that.
        </p>
      </section>

      <section>
        <h2>How to request one</h2>
        <p>
          Email <a href="mailto:billing@glowos.app" className="text-violet-soft underline">billing@glowos.app</a>{" "}
          from your account email with the word “refund” — that’s it. Approved refunds are returned
          to the original payment method via Razorpay within 5–7 working days.
        </p>
      </section>

      <section>
        <h2>Duplicate or failed payments</h2>
        <p>
          Charged twice, or money left your account but the subscription didn’t activate? Send us
          the payment reference and we’ll fix or refund it within 72 hours.
        </p>
      </section>
    </LegalPage>
  );
}
