import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (edge middleware) responsibilities:
 *  1. Refresh the Supabase session (httpOnly cookies) on every request.
 *  2. Emit a per-request Content-Security-Policy with a fresh nonce
 *     (strict: no unsafe-eval; nonce'd scripts only; frame-ancestors none).
 *  3. Protect authenticated routes server-side (never trust client flags).
 *  4. Re-enable microphone permission only on /voice (Phase 3).
 */

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/module", "/admin"];

// Origins the app legitimately talks to. Keep this list tight.
function buildCsp(nonce: string): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
  const dev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets nonce'd Next.js bootstrap scripts load their chunks.
    // Dev needs 'unsafe-eval' for react-refresh only — never shipped to prod.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com${dev ? " 'unsafe-eval'" : ""}`,
    // Tailwind injects inline style tags; styles are not a script-execution vector.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self' ${supabase} https://*.upstash.io https://*.ingest.sentry.io https://api.razorpay.com${dev ? " ws:" : ""}`,
    `frame-src https://api.razorpay.com https://checkout.razorpay.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Pass the nonce to the app via request headers so Next can tag its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() (not getSession()) — validates the JWT server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", path);
    response = NextResponse.redirect(url);
  }

  response.headers.set("Content-Security-Policy", csp);
  // Microphone stays off everywhere except /voice (Phase 3 recording page).
  if (path.startsWith("/voice")) {
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(self), geolocation=(), browsing-topics=()"
    );
  }

  return response;
}

export const config = {
  // Run on all routes except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
