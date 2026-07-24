import Link from "next/link";

/** Shared shell for plain-language legal pages. */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col gap-6 pb-16 pt-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
        ← Home
      </Link>
      <header>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {updated}</p>
      </header>
      <div className="prose-sm flex flex-col gap-5 text-sm leading-relaxed text-slate-300 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-100 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        {children}
      </div>
    </main>
  );
}
