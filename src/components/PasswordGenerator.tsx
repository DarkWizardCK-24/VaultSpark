"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_OPTIONS, generatePassword, type GeneratorOptions } from "@/lib/generator";
import { analyzePassword } from "@/lib/strength";
import { CopyButton } from "./ui/CopyButton";
import { StrengthBar } from "./ui/StrengthMeter";

const TOGGLES: { key: keyof Omit<GeneratorOptions, "length">; label: string }[] = [
  { key: "lowercase", label: "a-z" },
  { key: "uppercase", label: "A-Z" },
  { key: "digits", label: "0-9" },
  { key: "symbols", label: "!@#" },
  { key: "avoidAmbiguous", label: "No look-alikes" },
];

export function PasswordGenerator({ onUse, compact = false }: { onUse?: (pw: string) => void; compact?: boolean }) {
  const [opts, setOpts] = useState<GeneratorOptions>(DEFAULT_OPTIONS);
  const [pw, setPw] = useState("");

  const regenerate = useCallback(() => setPw(generatePassword(opts)), [opts]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- generate on mount and whenever options change
  useEffect(() => regenerate(), [regenerate]);

  const result = useMemo(() => analyzePassword(pw), [pw]);

  const toggle = (k: (typeof TOGGLES)[number]["key"]) => {
    const next = { ...opts, [k]: !opts[k] };
    // keep at least one character class enabled
    if (!next.lowercase && !next.uppercase && !next.digits && !next.symbols) return;
    setOpts(next);
  };

  return (
    <div className={compact ? "space-y-4" : "glass rounded-3xl p-6 sm:p-8 space-y-6"}>
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="break-all font-mono text-lg leading-relaxed sm:text-xl" aria-live="polite">
          {pw.split("").map((c, i) => (
            <span key={i} className={/\d/.test(c) ? "text-amber-300" : /[^A-Za-z0-9]/.test(c) ? "text-orange-300" : ""}>
              {c}
            </span>
          ))}
        </div>
        <div className="mt-4"><StrengthBar result={result} /></div>
        <div className="mt-1.5 flex justify-between text-xs text-white/50">
          <span style={{ color: result.color }}>{result.level}</span>
          <span>{result.entropy.toFixed(0)} bits · {result.crackTime}</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label !mb-0">Length</span>
          <span className="font-mono text-sm text-lime-300">{opts.length}</span>
        </div>
        <input
          type="range"
          min={8}
          max={64}
          value={opts.length}
          onChange={(e) => setOpts({ ...opts, length: +e.target.value })}
          className="w-full accent-lime-300"
          aria-label="Password length"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            aria-pressed={opts[t.key]}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              opts[t.key]
                ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost flex-1" onClick={regenerate}>
          <RefreshCw className="size-4" /> Regenerate
        </button>
        {onUse ? (
          <button type="button" className="btn btn-primary flex-1" onClick={() => onUse(pw)}>
            Use this password
          </button>
        ) : (
          <CopyButton text={pw} secret label="Password copied" className="btn btn-primary flex-1" title="Copy password">
            Copy
          </CopyButton>
        )}
      </div>
    </div>
  );
}
