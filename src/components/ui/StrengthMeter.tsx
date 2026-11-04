"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { StrengthResult } from "@/lib/strength";

const CONDITION_LABELS: Record<keyof StrengthResult["conditions"], string> = {
  lowercase: "Lowercase letters",
  uppercase: "Uppercase letters",
  digit: "Numbers",
  special: "Special characters",
  extended: "Extended / unicode",
};

export function StrengthBar({ result, empty }: { result: StrengthResult; empty?: boolean }) {
  const filled = empty ? 0 : Math.min(4, result.score + 1);
  return (
    <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={empty ? 0 : result.score} aria-label="Password strength">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 flex-1 rounded-full"
          animate={{ backgroundColor: i < filled ? result.color : "rgba(255,255,255,0.1)" }}
          transition={{ duration: 0.25 }}
        />
      ))}
    </div>
  );
}

export function StrengthMeter({ result, hasInput }: { result: StrengthResult; hasInput: boolean }) {
  const pct = Math.min(result.entropy / 100, 1);
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative mx-auto size-36">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - (hasInput ? pct : 0)), stroke: hasInput ? result.color : "rgb(255 255 255 / 0.1)" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            style={{ filter: hasInput ? `drop-shadow(0 0 8px ${result.color}88)` : undefined }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-3xl font-bold tabular-nums">{hasInput ? result.entropy.toFixed(0) : "-"}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50">bits</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Strength</div>
          <div className="text-2xl font-bold" style={{ color: hasInput ? result.color : undefined }}>
            {hasInput ? result.level : "Start typing…"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Time to crack (10B guesses/s)</div>
          <div className="text-lg font-semibold">{result.crackTime}</div>
        </div>
      </div>
    </div>
  );
}

export function ConditionList({ result, hasInput }: { result: StrengthResult; hasInput: boolean }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(CONDITION_LABELS) as (keyof typeof CONDITION_LABELS)[]).map((k) => {
        const met = hasInput && result.conditions[k];
        return (
          <li
            key={k}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
              met ? "border-lime-300/30 bg-lime-300/10 text-white" : "border-white/8 bg-black/20 text-white/45"
            }`}
          >
            {met ? <CheckCircle2 className="size-4 text-lime-300" /> : <Circle className="size-4" />}
            {CONDITION_LABELS[k]}
          </li>
        );
      })}
    </ul>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w) => (
        <li key={w} className="flex items-start gap-2 text-sm text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          {w}
        </li>
      ))}
    </ul>
  );
}
