"use client";

import { motion } from "framer-motion";

/**
 * The streak pet — an SVG creature with 5 growth stages (spec):
 * 0 egg · 1 hatchling · 2 chick · 3 fledgling · 4 radiant bird.
 * Grows with the user's streak; never guilt-trips on resets.
 */

const STAGE_META = [
  { label: "Glow Egg", hint: "Check off an action to start hatching" },
  { label: "Hatchling", hint: "3-day streak — it hatched!" },
  { label: "Chick", hint: "7-day streak — growing fast" },
  { label: "Fledgling", hint: "14-day streak — almost there" },
  { label: "Radiant", hint: "30-day streak — fully glowed up" },
] as const;

export default function StreakPet({ stage, streak }: { stage: number; streak: number }) {
  const s = Math.max(0, Math.min(4, stage));
  const meta = STAGE_META[s]!;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        key={s}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        aria-label={`Streak pet: ${meta.label}`}
      >
        <PetSvg stage={s} />
      </motion.div>
      <p className="text-sm font-semibold text-teal-soft">{meta.label}</p>
      <p className="text-[11px] text-slate-500">
        {streak > 0 ? `${streak}-day streak · ${meta.hint}` : meta.hint}
      </p>
    </div>
  );
}

function PetSvg({ stage }: { stage: number }) {
  const size = 96;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-hidden>
      {/* glow aura grows with stage */}
      <circle cx="48" cy="52" r={26 + stage * 4} fill="#6c4ff7" opacity={0.08 + stage * 0.04} />

      {stage === 0 && (
        // Egg
        <g>
          <ellipse cx="48" cy="54" rx="20" ry="26" fill="#e8e3f9" />
          <ellipse cx="42" cy="46" rx="6" ry="9" fill="#ffffff" opacity="0.6" />
          <path d="M34 58 l6 4 6-4 6 4 6-4 6 4" stroke="#6c4ff7" strokeWidth="2" fill="none" opacity="0.5" />
        </g>
      )}

      {stage >= 1 && (
        <g>
          {/* body */}
          <circle cx="48" cy="58" r={stage >= 3 ? 22 : 18} fill={stage >= 4 ? "#e8a020" : "#00b894"} />
          {/* belly */}
          <ellipse cx="48" cy="64" rx={stage >= 3 ? 12 : 9} ry={stage >= 3 ? 13 : 10} fill="#ffffff" opacity="0.35" />
          {/* head */}
          <circle cx="48" cy={stage >= 3 ? 34 : 38} r={stage >= 3 ? 15 : 12} fill={stage >= 4 ? "#f2bd5a" : "#3fd6b8"} />
          {/* eyes */}
          <circle cx="43" cy={stage >= 3 ? 32 : 36} r="2.4" fill="#141b2e" />
          <circle cx="53" cy={stage >= 3 ? 32 : 36} r="2.4" fill="#141b2e" />
          {/* beak */}
          <polygon
            points={stage >= 3 ? "45,38 51,38 48,43" : "45.5,41 50.5,41 48,45"}
            fill="#e8a020"
          />
          {/* wings from stage 2 */}
          {stage >= 2 && (
            <>
              <ellipse cx="28" cy="58" rx="7" ry="12" fill={stage >= 4 ? "#e8a020" : "#00b894"} transform="rotate(20 28 58)" />
              <ellipse cx="68" cy="58" rx="7" ry="12" fill={stage >= 4 ? "#e8a020" : "#00b894"} transform="rotate(-20 68 58)" />
            </>
          )}
          {/* crest from stage 3 */}
          {stage >= 3 && (
            <path d="M42 22 q3 -8 6 0 q3 -8 6 0" stroke={stage >= 4 ? "#e8a020" : "#00b894"} strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          {/* sparkles at stage 4 */}
          {stage >= 4 && (
            <g fill="#f2bd5a">
              <circle cx="18" cy="30" r="2" />
              <circle cx="78" cy="26" r="2.5" />
              <circle cx="82" cy="66" r="2" />
              <circle cx="14" cy="70" r="1.6" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
