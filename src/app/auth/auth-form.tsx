"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Passwordless auth only: email magic link + Google OAuth. No passwords in v1
 * = no credential-stuffing surface. 18+ age gate is required before either
 * method proceeds and is recorded on first sign-in (see /auth/callback).
 */
export default function AuthForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/blueprint";

  const [email, setEmail] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setMessage("Please enter a valid email address.");
      setState("error");
      return;
    }
    if (!ageOk) {
      setMessage("GlowOS is for adults — please confirm you're 18 or older.");
      setState("error");
      return;
    }
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      // Generic message — never reveal whether the account exists.
      setMessage("Couldn't send the link right now. Please try again in a minute.");
      setState("error");
      return;
    }
    setState("sent");
  }

  async function signInWithGoogle() {
    setMessage(null);
    if (!ageOk) {
      setMessage("GlowOS is for adults — please confirm you're 18 or older.");
      setState("error");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Welcome to GlowOS</h1>
        <p className="mt-2 text-sm text-slate-400">
          No passwords here — we email you a magic link instead. Safer for everyone.
        </p>
      </div>

      {state === "sent" ? (
        <div className="card text-center animate-fade-up">
          <p className="text-4xl" aria-hidden>
            📮
          </p>
          <h2 className="mt-2 text-lg font-bold">Check your inbox</h2>
          <p className="mt-1 text-sm text-slate-400">
            We sent a sign-in link to <strong className="text-slate-200">{email}</strong>. It’s valid
            for a short while — tap it on this device.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={sendMagicLink} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl border border-white/10 bg-navy-700/70 px-4 py-3.5 outline-none placeholder:text-slate-600 focus:border-violet"
              />
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-white/20 bg-navy-700 accent-violet"
              />
              <span>
                I confirm I am <strong>18 or older</strong> and agree to the{" "}
                <Link href="/terms" className="text-violet-soft underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-violet-soft underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button type="submit" disabled={state === "sending"} className="btn-primary">
              {state === "sending" ? "Sending…" : "Email me a magic link"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button onClick={() => void signInWithGoogle()} className="btn-ghost">
            <span className="mr-2" aria-hidden>
              🔵
            </span>
            Continue with Google
          </button>
        </>
      )}

      {message ? (
        <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {message}
        </p>
      ) : null}
    </main>
  );
}
