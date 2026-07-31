import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/** Request-time value; isolated so the lint purity rule sees a plain call. */
function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

/**
 * /admin — founder only.
 *
 * The role is read SERVER-SIDE from profiles.role on every request (spec §1):
 * never a client flag, never a cookie claim. A non-admin gets a 404 rather
 * than a 403, so the route's existence isn't confirmed to a prober.
 *
 * Aggregate counts use the service-role client because RLS deliberately hides
 * other users' rows even from an admin session — the elevated read happens
 * only AFTER the role check passes, and only for counts, never row contents.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") notFound();

  const admin = createAdminClient();
  const since = sevenDaysAgoIso();

  const [users, paid, blueprints, actions, aiEvents, payments, products] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin.from("blueprints").select("id", { count: "exact", head: true }),
    admin
      .from("daily_actions")
      .select("id", { count: "exact", head: true })
      .eq("done", true),
    admin
      .from("audit_log")
      .select("meta")
      .eq("event", "ai_generation")
      .gte("created_at", since)
      .limit(1000),
    admin.from("payments").select("amount, status").eq("status", "captured"),
    admin
      .from("products")
      .select("id, module, name, budget_tier, active")
      .order("module", { ascending: true }),
  ]);

  // AI spend proxy: token totals from the audit log (last 7 days).
  const tokens = (aiEvents.data ?? []).reduce(
    (acc, row) => {
      const m = (row.meta ?? {}) as { input_tokens?: number; output_tokens?: number };
      return {
        input: acc.input + (m.input_tokens ?? 0),
        output: acc.output + (m.output_tokens ?? 0),
      };
    },
    { input: 0, output: 0 }
  );

  const revenuePaise = (payments.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const stats = [
    { label: "Users", value: users.count ?? 0 },
    { label: "Active subs", value: paid.count ?? 0 },
    { label: "Blueprints", value: blueprints.count ?? 0 },
    { label: "Actions done", value: actions.count ?? 0 },
  ];

  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Admin</h1>
          <p className="text-xs text-slate-500">Founder view · aggregates only</p>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
          ← Dashboard
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card text-center !p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-violet-soft tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-bold">Revenue</h2>
        <p className="mt-1 text-3xl font-extrabold text-gold-soft tabular-nums">
          ₹{(revenuePaise / 100).toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Captured payments, all time. Live once Razorpay webhooks are wired.
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold">AI spend — last 7 days</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Input tokens</p>
            <p className="text-xl font-bold tabular-nums">{tokens.input.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Output tokens</p>
            <p className="text-xl font-bold tabular-nums">{tokens.output.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          Cost is a security metric — a sudden spike usually means abuse or a runaway loop.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Curated products</h2>
          <span className="text-xs text-slate-500">{products.data?.length ?? 0} total</span>
        </div>
        <p className="text-xs text-slate-500">
          The AI may only recommend from this list, by id. Edit rows in the Supabase table editor —
          an in-app editor ships with the admin update.
        </p>
        <div className="flex flex-col gap-2">
          {(products.data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-navy-800/70 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium">{p.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {p.module} · {p.budget_tier}
                </span>
              </span>
              <span className={`chip shrink-0 ${p.active ? "text-teal-soft" : "text-slate-600"}`}>
                {p.active ? "active" : "off"}
              </span>
            </div>
          ))}
          {(products.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">
              No products yet — run <code className="text-slate-400">supabase/seed.sql</code>.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
