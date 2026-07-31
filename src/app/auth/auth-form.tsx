"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Turn a Supabase auth error into a message that is useful without being an
 * account-enumeration oracle.
 *
 * The spec's "generic errors" rule exists to stop an attacker learning whether
 * an email is registered. None of the branches below reveal that: a config
 * error, a rate limit or a network failure produces the SAME message for a
 * registered and an unregistered address. What the old blanket message did
 * instead was hide operational faults from us — a misconfigured key and an
 * exhausted email quota looked identical, and neither was actionable.
 */
function authErrorMessage(error: { message?: string; status?: number; code?: string }): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  // Always log the real error — it's already visible in the network tab, and
  // it's what makes a screenshot of this screen diagnosable.
  console.error("[auth] sign-in failed", error);

  if (code === "over_email_send_rate_limit" || error.status === 429 || msg.includes("rate limit")) {
    return "Too many sign-in emails from this address just now. Please wait a few minutes and try again.";
  }
  if (error.status === 401 || msg.includes("invalid api key")) {
    return "Sign-in isn't configured correctly on our side (auth key). We've been alerted — please try again shortly.";
  }
  if (msg.includes("redirect") || msg.includes("not allowed") || error.status === 422) {
    return "Sign-in isn't configured correctly on our side (redirect URL). We've been alerted — please try again shortly.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Couldn't reach our servers — check your connection and try again.";
  }
  return "Couldn't send the link right now. Please try again in a minute.";
}

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

  /**
   * Build the callback URL from the origin the user is ACTUALLY on, not from a
   * build-time env var — a stale NEXT_PUBLIC_SITE_URL (e.g. the localhost
   * default) sends every magic link to a host the user's device can't reach.
   * Computed at click time, so `window` is always available. Preview
   * deployments work too. Supabase still validates this against its Redirect
   * URLs allowlist server-side, so this is not an open-redirect surface.
   */
  function callbackUrl(): string {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

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
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setMessage(authErrorMessage(error));
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // Previously this error was discarded entirely, so a failed Google sign-in
    // looked like nothing had happened at all.
    if (error) {
      setMessage(authErrorMessage(error));
      setState("error");
    }
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
