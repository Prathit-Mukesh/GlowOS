import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE client. Bypasses RLS.
 *
 * ⚠️ SERVER ONLY. The `server-only` import makes any accidental client-side
 * import a build error. Use exclusively for:
 *   - audit_log writes
 *   - payment/subscription writes from verified Razorpay webhooks (Phase 3)
 * Never pass its results to the client unfiltered.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service-role env vars are not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
