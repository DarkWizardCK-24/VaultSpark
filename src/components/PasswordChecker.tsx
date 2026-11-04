"use client";

import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { breachCount } from "@/lib/breach";
import { analyzePassword } from "@/lib/strength";
import { PasswordField } from "./ui/PasswordField";
import { ConditionList, StrengthMeter, Warnings } from "./ui/StrengthMeter";

type Breach = { state: "idle" | "checking" | "safe" | "pwned" | "error"; count?: number };

export function PasswordChecker() {
  const [pw, setPw] = useState("");
  const [breach, setBreach] = useState<Breach>({ state: "idle" });
  const result = useMemo(() => analyzePassword(pw), [pw]);
  const hasInput = pw.length > 0;

  async function check() {
    setBreach({ state: "checking" });
    try {
      const count = await breachCount(pw);
      setBreach(count > 0 ? { state: "pwned", count } : { state: "safe" });
    } catch {
      setBreach({ state: "error" });
    }
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <label htmlFor="checker" className="label">Test a password</label>
      <PasswordField id="checker" value={pw} onChange={(v) => { setPw(v); setBreach({ state: "idle" }); }} placeholder="Type a password…" />
      <p className="mt-2 text-xs text-white/40">Analysed locally in your browser. Never uploaded or stored.</p>

      <div className="mt-8"><StrengthMeter result={result} hasInput={hasInput} /></div>
      <div className="mt-6"><Warnings warnings={result.warnings} /></div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-white/60">Has it leaked before? Checks 800M+ breached passwords privately. Only a 5-character hash prefix is sent.</p>
          <button disabled={!hasInput || breach.state === "checking"} onClick={check} className="btn btn-ghost !py-2">
            {breach.state === "checking" && <Loader2 className="size-4 animate-spin" />}Check breaches
          </button>
        </div>
        {breach.state === "safe" && <p className="mt-3 flex items-center gap-2 text-sm text-lime-300"><ShieldCheck className="size-4" /> Not found in any known breach.</p>}
        {breach.state === "pwned" && <p className="mt-3 flex items-start gap-2 text-sm text-rose-300"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> Seen in breaches {breach.count?.toLocaleString()} times. Don’t use it.</p>}
        {breach.state === "error" && <p className="mt-3 text-sm text-amber-300">Couldn’t reach the breach service. Try again later.</p>}
      </div>

      <h3 className="label mt-6">Requirements</h3>
      <ConditionList result={result} hasInput={hasInput} />
    </div>
  );
}
