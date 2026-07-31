import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";
import { getEntitlement } from "@/lib/entitlements";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * /settings — profile, budget tier, plan status, and the two data rights the
 * privacy policy promises: export my data (JSON) and one-tap hard delete.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/settings");

  const [{ data: profile }, entitlement] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, budget_tier, goals, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    getEntitlement(supabase, user.id),
  ]);

  const isSubscriber = entitlement.isSubscriber;

  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
          ← Dashboard
        </Link>
      </header>

      <section className="card">
        <p className="text-xs text-slate-500">Signed in as</p>
        <p className="text-sm font-medium break-all">{user.email}</p>
        {profile?.created_at ? (
          <p className="mt-1 text-[11px] text-slate-600">
            Member since {new Date(profile.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
      </section>

      <SettingsForm
        initialName={profile?.display_name ?? ""}
        initialTier={(profile?.budget_tier as "t500" | "t1500" | "t5000") ?? "t500"}
      />

      {/* Plan — free for all during early access */}
      <section className="card border-teal/30">
        <h2 className="font-bold">Your plan</h2>
        <p className="mt-1 text-sm text-slate-300">
          <span className="font-semibold text-teal-soft">Full access</span> — free, all five modules
          {isSubscriber ? ", plus your existing subscription" : ""}.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          GlowOS is free for everyone while we&apos;re in early access. There&apos;s nothing to
          manage, cancel or pay — and no card on file.
        </p>
        <Link href="/pricing" className="btn-ghost mt-3 w-full text-sm">
          What&apos;s included
        </Link>
      </section>

      <footer className="border-t border-white/5 pt-5 text-center text-xs text-slate-600">
        <nav className="flex justify-center gap-5">
          <Link href="/privacy" className="hover:text-slate-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-300">
            Terms
          </Link>
          <Link href="/refunds" className="hover:text-slate-300">
            Refunds
          </Link>
        </nav>
      </footer>
    </main>
  );
}
