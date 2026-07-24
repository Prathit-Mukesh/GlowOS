/** @type {import('next').NextConfig} */

// Static security headers. The Content-Security-Policy is intentionally NOT set
// here — it is emitted per-request from middleware.ts with a fresh nonce so that
// script-src can stay strict (nonce + strict-dynamic, no 'unsafe-inline',
// no 'unsafe-eval'). Everything below is request-independent and safe to pin.
const securityHeaders = [
  {
    // Force HTTPS for 2 years, include subdomains, allow preload-list submission.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Clickjacking protection (belt-and-suspenders with CSP frame-ancestors).
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Stop MIME-sniffing.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Default deny for powerful features. microphone is re-enabled only on
    // /voice from middleware (Phase 3). camera is never used in v1.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    // Isolate our origin from cross-origin popups/embeds.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Only ever serve images from our own origin + Supabase storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
