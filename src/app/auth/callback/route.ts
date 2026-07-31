import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Only ever redirect to a same-origin path — blocks open-redirect abuse. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/blueprint";
  return raw;
}

/**
 * The public origin of this request. Behind Vercel's proxy `request.url` can
 * carry an internal host, which would redirect the user somewhere they can't
 * reach — prefer the forwarded headers the proxy sets.
 */
function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * GET /auth/callback — exchanges the magic-link / OAuth code for a session
 * (httpOnly cookies), stamps the 18+ age gate on first sign-in, audits the
 * login, and redirects onward.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    await audit("failed_auth", { ip: clientIp(request.headers), meta: { reason: "exchange_failed" } });
    return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Record the age-gate confirmation with a timestamp on first sign-in.
    // The /auth UI cannot submit without ticking the 18+ box, so reaching a
    // session implies confirmation; we persist the moment it happened.
    await supabase
      .from("profiles")
      .update({ age_confirmed: true, age_verified_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("age_verified_at", null);

    await audit("login", { userId: user.id, ip: clientIp(request.headers) });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
