# GlowOS — The AI Personal Polish Engine

A production-grade, mobile-first web app that gives users a personalized self-improvement
system across 5 modules — **Body, Skin & Groom, Style, Mind, Voice** — powered by an LLM,
gamified with streaks and scores, monetized by subscription.

**Priorities, in order: 1) Security · 2) Mobile experience · 3) Speed to ship · 4) Cost.**

## Stack (fixed)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) — spec said 14+; 16.2.11 is the audit-clean line |
| Styling | Tailwind CSS |
| Backend/DB/Auth/Storage | Supabase (Postgres + Auth + Storage + RLS) |
| AI | Anthropic Claude API (server-side only) — Phase 2 |
| Payments | Razorpay (UPI-first) — Phase 3 |
| Hosting | Vercel |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Validation | Zod on every input boundary |
| Monitoring | Sentry + Vercel Analytics — Phase 4 |

## Build phases

- ✅ **Phase 1 — Skeleton (this code):** auth (magic link + Google, passwordless), RLS-enabled
  schema, landing, 12-question quiz, deterministic Polish Score, rules-based Blueprint reveal,
  module detail pages, legal pages, security headers + strict CSP.
- ⬜ **Phase 2 — AI brain:** `/api/ai/blueprint` (Claude), daily loop + streak pet.
- ⬜ **Phase 3 — Money:** Razorpay subscriptions, verified webhooks, settings (delete/export).
- ⬜ **Phase 4 — Voice & polish:** voice scoring, recap cards, admin panel, Sentry, ZAP scan.

## Getting started

1. **Create a Supabase project** → SQL Editor → run, in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_storage.sql`
   - `supabase/seed.sql` (optional starter products)
2. **Auth settings** (Supabase → Authentication):
   - Enable **Email (magic link)** and **Google** providers.
   - Set Site URL + redirect URL to `https://<your-domain>/auth/callback` (and
     `http://localhost:3000/auth/callback` for dev).
3. **Env vars:** copy `.env.example` → `.env.local` and fill in values. Real secrets go
   **only** in Vercel/Supabase dashboards. Never commit them.
4. `npm install && npm run dev`

## Security model (Phase 1)

- **RLS deny-by-default on every table**, `user_id = auth.uid()` policies; no user DELETE
  path — hard deletes only via the `delete_my_data()` RPC. Verify with `npm run test:rls`
  (point at a staging project).
- **Passwordless auth only** (magic link + Google) in httpOnly/Secure/SameSite=Lax cookies —
  no tokens in localStorage, no password database to breach.
- **Strict CSP with per-request nonce** from `src/proxy.ts` (no `unsafe-eval`;
  `frame-ancestors 'none'`), plus HSTS, nosniff, X-Frame-Options DENY, Permissions-Policy
  (mic/camera off; mic re-enabled only on `/voice`).
- **Zod on every boundary** (`src/lib/validation/*`): strict schemas, enums, length caps;
  the one free-text field is HTML-stripped and capped at 200 chars.
- **Rate limits** (Upstash, `src/lib/rate-limit.ts`): global 100/min/IP · auth 5/min/IP ·
  quiz 3/hour/IP · AI 10–30/day/user · voice 5/day/user. Sensitive limiters fail closed in prod.
- **Service-role key** is imported via `server-only` module — a client import is a build error.
- **Audit log** with salted-SHA-256 IP hashes; raw IPs are never stored.
- Generic error messages everywhere; UUIDs everywhere; no sequential IDs.

### Founder checklist (do these yourself — not in code)

- Turn on **MFA** for: Supabase, Vercel, Razorpay, GitHub, domain registrar, email.
- Enable GitHub **secret scanning** + **Dependabot**.
- Supabase **daily backups ON**; do one restore drill before launch.
- Keep the Claude API key and service-role key ONLY in server env vars.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test:rls` | RLS attack test against your Supabase project |
