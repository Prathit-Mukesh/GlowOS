"use client";

import { motion } from "framer-motion";
import { MODULES, MODULE_META, type Module } from "@/lib/quiz-questions";

interface Props {
  scores: Record<Module, number>;
  size?: number;
}

/**
 * Animated 5-axis radar chart of the Polish Score, pure SVG (no chart lib —
 * smaller bundle, no CSP surprises).
 */
export default function RadarChart({ scores, size = 300 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const n = MODULES.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, factor: number): [number, number] => [
    cx + Math.cos(angle(i)) * r * factor,
    cy + Math.sin(angle(i)) * r * factor,
  ];

  const polygon = (factor: number) =>
    Array.from({ length: n }, (_, i) => point(i, factor).join(",")).join(" ");

  const valuePolygon = MODULES.map((m, i) => point(i, Math.max(0.06, scores[m] / 100)).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[320px]"
      role="img"
      aria-label={`Polish Score radar: ${MODULES.map((m) => `${MODULE_META[m].label} ${scores[m]}`).join(", ")}`}
    >
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={polygon(f)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      {/* spokes */}
      {MODULES.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      {/* value area */}
      <motion.polygon
        points={valuePolygon}
        fill="rgba(108,79,247,0.35)"
        stroke="#6c4ff7"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* vertex dots + labels */}
      {MODULES.map((m, i) => {
        const [x, y] = point(i, Math.max(0.06, scores[m] / 100));
        const [lx, ly] = point(i, 1.22);
        return (
          <g key={m}>
            <circle cx={x} cy={y} r={4} fill="#00b894" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-300"
              fontSize={12}
              fontWeight={600}
            >
              {MODULE_META[m].label.split(" ")[0]}
            </text>
            <text
              x={lx}
              y={ly + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500"
              fontSize={11}
            >
              {scores[m]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
