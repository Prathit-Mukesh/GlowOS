"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tier = "t500" | "t1500" | "t5000";

const TIERS: Array<{ value: Tier; label: string; hint: string }> = [
  { value: "t500", label: "Up to ₹500", hint: "Mostly free habits" },
  { value: "t1500", label: "Around ₹1,500", hint: "A few basics" },
  { value: "t5000", label: "₹5,000+", hint: "Room for gear" },
];

/**
 * Client half of /settings: profile edit, data export, and the hard-delete
 * flow. Delete requires typing DELETE — a mis-tap must not destroy an account.
 */
export default function SettingsForm({
  initialName,
  initialTier,
}: {
  initialName: string;
  initialTier: Tier;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [tier, setTier] = useState<Tier>(initialTier);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim() || undefined, budget_tier: tier }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glowos-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Couldn't build your export just now — please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteEverything() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/settings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Account is gone — leave the app entirely.
      window.location.href = "/?deleted=1";
    } catch {
      setDeleteError("Couldn't complete the deletion — please try again or email us.");
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Profile */}
      <form onSubmit={saveProfile} className="card flex flex-col gap-4">
        <h2 className="font-bold">Your profile</h2>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="What should we call you?"
            className="rounded-xl border border-white/10 bg-navy-700/70 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-slate-300">Monthly budget</legend>
          <div className="flex flex-col gap-2">
            {TIERS.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setTier(t.value)}
                aria-pressed={tier === t.value}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                  tier === t.value
                    ? "border-violet bg-violet/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="block text-xs text-slate-500">{t.hint}</span>
                </span>
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border ${
                    tier === t.value ? "border-violet bg-violet" : "border-white/20"
                  }`}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">
            We only ever suggest things inside this budget. New plans use it right away.
          </p>
        </fieldset>

        <button type="submit" disabled={saveState === "saving"} className="btn-primary text-sm">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save changes"}
        </button>
        {saveState === "error" ? (
          <p role="alert" className="text-sm text-red-300">
            Couldn&apos;t save that — please try again.
          </p>
        ) : null}
      </form>

      {/* Data rights */}
      <section className="card">
        <h2 className="font-bold">Your data</h2>
        <p className="mt-1 text-sm text-slate-400">
          It&apos;s yours. Take a copy whenever you like, or erase all of it in one tap.
        </p>

        <button
          onClick={() => void exportData()}
          disabled={exporting}
          className="btn-ghost mt-4 w-full text-sm"
        >
          {exporting ? "Preparing your file…" : "⬇ Export my data (JSON)"}
        </button>
        {exportError ? (
          <p role="alert" className="mt-2 text-sm text-red-300">
            {exportError}
          </p>
        ) : null}

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="mt-3 w-full rounded-xl border border-red-500/30 px-6 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
          >
            Delete my data
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/5 p-4">
            <h3 className="font-semibold text-red-300">Delete everything?</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              This erases your profile, quiz answers, Blueprints, scores, streaks and any voice
              clips — immediately and permanently. Your account is closed. This cannot be undone.
            </p>
            <label className="mt-3 block">
              <span className="text-xs text-slate-400">
                Type <strong className="text-red-300">DELETE</strong> to confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm outline-none focus:border-red-400"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setConfirmText("");
                  setDeleteError(null);
                }}
                className="btn-ghost flex-1 !py-2.5 text-sm"
              >
                Keep my account
              </button>
              <button
                onClick={() => void deleteEverything()}
                disabled={confirmText !== "DELETE" || deleting}
                className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
            {deleteError ? (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {deleteError}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
