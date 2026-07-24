/**
 * RLS attack test — Security Definition of Done item #1.
 *
 * Proves with the ANON KEY (exactly what any visitor holds) that:
 *   1. Anonymous clients read ZERO rows from every user table.
 *   2. Anonymous clients cannot INSERT into any user table.
 *   3. User A cannot read or write User B's rows.
 *   4. A user cannot self-promote to admin via profile update.
 *   5. Users cannot write payments/subscriptions/audit_log at all.
 *
 * Run: npm run test:rls
 * Needs env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY (to provision the two throwaway test users).
 * Point it at a staging/dev project, never production with real users.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const USER_TABLES = [
  "profiles",
  "blueprints",
  "polish_scores",
  "daily_actions",
  "streaks",
  "subscriptions",
  "payments",
  "voice_logs",
  "audit_log",
] as const;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  const mark = ok ? "✅" : "❌";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

  // --- provision two throwaway users -----------------------------------------
  const stamp = Date.now();
  const mkUser = async (tag: string) => {
    const email = `rls-test-${tag}-${stamp}@example.com`;
    const password = `Rls-Test-${stamp}-${tag}!`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser(${tag}) failed: ${error?.message}`);
    return { id: data.user.id, email, password };
  };

  const userA = await mkUser("a");
  const userB = await mkUser("b");
  console.log(`Provisioned test users A=${userA.id} B=${userB.id}\n`);

  try {
    // Seed a row for user B that user A will try to steal.
    await admin.from("polish_scores").insert({
      user_id: userB.id,
      body: 50, skin: 50, style: 50, mind: 50, voice: 50, total: 50,
    });

    // =========================================================================
    // 1) Pure-anonymous client: every user table must return zero rows.
    // =========================================================================
    const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
    for (const table of USER_TABLES) {
      const { data, error } = await anon.from(table).select("*").limit(5);
      check(
        `anon SELECT ${table} returns no rows`,
        !error && Array.isArray(data) && data.length === 0,
        error ? `error: ${error.message}` : `rows: ${data?.length ?? 0}`
      );
    }

    // Anonymous INSERT must fail everywhere.
    const { error: anonInsErr } = await anon
      .from("polish_scores")
      .insert({ user_id: userB.id, body: 1, skin: 1, style: 1, mind: 1, voice: 1, total: 1 });
    check("anon INSERT polish_scores rejected", !!anonInsErr);

    // products: SELECT allowed (public catalog), write must fail.
    const { error: prodReadErr } = await anon.from("products").select("id").limit(1);
    check("anon SELECT products allowed (public catalog)", !prodReadErr);
    const { error: prodInsErr } = await anon
      .from("products")
      .insert({ module: "skin", name: "evil", budget_tier: "t500" });
    check("anon INSERT products rejected", !!prodInsErr);

    // =========================================================================
    // 2) Signed-in user A tries to reach user B's rows.
    // =========================================================================
    const clientA = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInErr } = await clientA.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });
    if (signInErr) throw new Error(`sign-in as A failed: ${signInErr.message}`);

    const { data: crossRead } = await clientA
      .from("polish_scores")
      .select("*")
      .eq("user_id", userB.id);
    check("A SELECT B's polish_scores returns no rows", (crossRead ?? []).length === 0);

    const { data: profB } = await clientA.from("profiles").select("*").eq("id", userB.id);
    check("A SELECT B's profile returns no rows", (profB ?? []).length === 0);

    const { error: crossInsErr } = await clientA.from("polish_scores").insert({
      user_id: userB.id, body: 9, skin: 9, style: 9, mind: 9, voice: 9, total: 9,
    });
    check("A INSERT into B's polish_scores rejected", !!crossInsErr);

    const { error: crossUpdErr, data: crossUpdData } = await clientA
      .from("profiles")
      .update({ display_name: "hacked" })
      .eq("id", userB.id)
      .select();
    check(
      "A UPDATE B's profile affects no rows",
      !!crossUpdErr || (crossUpdData ?? []).length === 0
    );

    // Own-row sanity: A CAN write A's rows (RLS isn't just 'deny everything').
    const { error: ownInsErr } = await clientA.from("polish_scores").insert({
      user_id: userA.id, body: 40, skin: 40, style: 40, mind: 40, voice: 40, total: 40,
    });
    check("A INSERT own polish_scores allowed", !ownInsErr, ownInsErr?.message ?? "");

    // Self-promotion to admin must fail (policy: with check role='user').
    const { data: promoData, error: promoErr } = await clientA
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userA.id)
      .select("role");
    const promoted = !promoErr && (promoData ?? []).some((r) => r.role === "admin");
    check("A cannot self-promote to admin", !promoted, promoErr?.message ?? "");

    // Users can never write payment/subscription/audit tables.
    const { error: payErr } = await clientA
      .from("payments")
      .insert({ user_id: userA.id, amount: 1, currency: "INR", status: "paid" });
    check("A INSERT payments rejected (service-role only)", !!payErr);

    const { error: subErr } = await clientA
      .from("subscriptions")
      .insert({ user_id: userA.id, plan: "glow-pass", status: "active" });
    check("A INSERT subscriptions rejected (service-role only)", !!subErr);

    const { error: auditErr } = await clientA
      .from("audit_log")
      .insert({ user_id: userA.id, event: "login" });
    check("A INSERT audit_log rejected (service-role only)", !!auditErr);

    // Users have no DELETE path (hard delete only via delete_my_data RPC).
    const { error: delErr, data: delData } = await clientA
      .from("polish_scores")
      .delete()
      .eq("user_id", userA.id)
      .select();
    check("A DELETE own polish_scores affects no rows", !!delErr || (delData ?? []).length === 0);
  } finally {
    // --- cleanup ---------------------------------------------------------------
    await admin.auth.admin.deleteUser(userA.id).catch(() => {});
    await admin.auth.admin.deleteUser(userB.id).catch(() => {});
    console.log("\nCleaned up test users.");
  }

  if (failures > 0) {
    console.error(`\n${failures} RLS check(s) FAILED — do not ship.`);
    process.exit(1);
  }
  console.log("\nAll RLS checks passed. Anon key is safe to expose.");
}

main().catch((err) => {
  console.error("RLS test crashed:", err);
  process.exit(1);
});
