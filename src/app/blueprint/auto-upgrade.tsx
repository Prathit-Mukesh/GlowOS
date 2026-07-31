"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Auto-upgrade a rules-based Blueprint to a full AI-personalised one.
 *
 * Every signed-in user gets a detailed, customised plan for free — nobody has
 * to know to press a button. The quiz still writes a rules plan instantly (so
 * the reveal is never blocked on a slow model call); this fires once
 * afterwards and swaps in the AI version.
 *
 * Fires at most once per mount, only when the stored plan is rules-based.
 * Every failure mode is silent by design: the rules plan is already a complete,
 * usable Blueprint, so a rate limit or an AI outage should never show the user
 * an error about something they didn't ask for.
 */
export default function AutoUpgrade() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done">("working");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/ai/blueprint", { method: "POST" });
        if (res.ok) {
          router.refresh();
          return;
        }
      } catch {
        /* keep the rules plan — it's already complete */
      }
      setState("done");
    })();
  }, [router]);

  if (state === "done") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex items-center gap-3 border-violet/30 !py-3"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-70" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-violet" />
      </span>
      <span className="text-sm text-slate-300">
        Personalising your plan with AI…{" "}
        <span className="text-slate-500">your current plan works meanwhile.</span>
      </span>
    </motion.div>
  );
}
