"use client";

import { useEffect, useMemo, useState } from "react";
import { generateTotp, parseTotp } from "@/lib/totp";
import { CopyButton } from "./CopyButton";

export function TotpCode({ secret }: { secret: string }) {
  const cfg = useMemo(() => parseTotp(secret), [secret]);
  const [state, setState] = useState<{ code: string; remaining: number } | null>(null);

  useEffect(() => {
    if (!cfg) return;
    let alive = true;
    const tick = async () => {
      const r = await generateTotp(cfg);
      if (alive) setState(r);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [cfg]);

  if (!cfg) return <span className="text-xs text-rose-300">Invalid 2FA secret</span>;
  if (!state) return null;
  const pct = state.remaining / cfg.period;
  const low = state.remaining <= 5;
  const R = 9;
  const C = 2 * Math.PI * R;
  const spaced = state.code.replace(/(\d{3})(\d+)/, "$1 $2");

  return (
    <div className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2">
      <svg viewBox="0 0 24 24" className="size-6 shrink-0 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="3" />
        <circle cx="12" cy="12" r={R} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} stroke={low ? "#fb923c" : "#bef264"} style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <span className={`flex-1 font-mono text-lg font-semibold tracking-[0.18em] ${low ? "text-orange-300" : "text-lime-200"}`} aria-label="One-time code">
        {spaced}
      </span>
      <span className="text-xs tabular-nums text-white/40">{state.remaining}s</span>
      <CopyButton text={state.code} label="Code copied" title="Copy 2FA code" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" />
    </div>
  );
}
