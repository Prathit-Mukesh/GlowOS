import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 text-center">
      <p className="text-5xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold">That page wandered off</h1>
      <p className="max-w-xs text-sm text-slate-400">
        No worries — everything you need is one tap away.
      </p>
      <Link href="/" className="btn-primary w-full">
        Back home
      </Link>
    </main>
  );
}
