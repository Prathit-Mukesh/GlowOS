"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses ONLY the anon key (safe to expose because RLS
 * is deny-by-default and airtight — see supabase/tests/rls.test.ts). Auth
 * state rides on cookies managed by @supabase/ssr, not localStorage.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
