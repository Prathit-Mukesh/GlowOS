"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Refresh with AI" — calls /api/ai/blueprint (server-side Claude call). */
export default function RegenButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error" | "limit">("idle");

  async function regen() {
    if (state === "working") return;
    setState("working");
    try {
      const res = await fetch("/api/ai/blueprint", { method: "POST" });
      if (res.status === 429) {
        setState("limit");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="text-center">
      <button onClick={() => void regen()} disabled={state === "working"} className="btn-ghost w-full text-sm">
        {state === "working" ? "Rebuilding your Blueprint…" : "✨ Refresh my plan with AI"}
      </button>
      {state === "limit" ? (
        <p className="mt-1 text-[11px] text-slate-500">Daily refresh limit reached — try tomorrow.</p>
      ) : null}
      {state === "error" ? (
        <p className="mt-1 text-[11px] text-red-300">Couldn&apos;t refresh right now — your current plan still works.</p>
      ) : null}
    </div>
  );
}
