"use client";

import { Clock, Copy, Loader2, ScanSearch, ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { breachCount } from "@/lib/breach";
import { analyzePassword } from "@/lib/strength";
import type { Credential } from "@/lib/types";

const STALE_DAYS = 180;

export function auditVault(all: Credential[], breached: Set<string> = new Set()) {
  const creds = all.filter((c) => c.type === "login" && c.password);
  const counts = new Map<string, number>();
  creds.forEach((c) => counts.set(c.password, (counts.get(c.password) ?? 0) + 1));
  const now = Date.now();
  const weak: Credential[] = [];
  const reused: Credential[] = [];
  const stale: Credential[] = [];
  const pwned: Credential[] = [];
  creds.forEach((c) => {
    if (analyzePassword(c.password).score <= 1) weak.push(c);
    if ((counts.get(c.password) ?? 0) > 1) reused.push(c);
    if (now - c.passwordChangedAt > STALE_DAYS * 86400_000) stale.push(c);
    if (breached.has(c.id)) pwned.push(c);
  });
  const flagged = new Set([...weak, ...reused, ...stale, ...pwned].map((c) => c.id)).size;
  const score = creds.length ? Math.round(100 * (1 - flagged / creds.length)) : 100;
  return { weak, reused, stale, pwned, score, total: creds.length };
}

export function SecurityAudit({ credentials, onEdit }: { credentials: Credential[]; onEdit: (c: Credential) => void }) {
  const [breached, setBreached] = useState<Set<string>>(new Set());
  const [scanned, setScanned] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const audit = useMemo(() => auditVault(credentials, breached), [credentials, breached]);
  const tone = audit.score >= 80 ? "#a3e635" : audit.score >= 50 ? "#fbbf24" : "#f43f5e";

  async function scan() {
    const logins = credentials.filter((c) => c.type === "login" && c.password);
    const found = new Set<string>();
    try {
      for (let i = 0; i < logins.length; i++) {
        setProgress(i + 1);
        if ((await breachCount(logins[i].password)) > 0) found.add(logins[i].id);
      }
      setBreached(found);
      setScanned(true);
      toast[found.size ? "error" : "success"](found.size ? `${found.size} password(s) found in data breaches` : "No breached passwords found");
    } catch {
      toast.error("Couldn’t reach the breach service. Try again later.");
    } finally {
      setProgress(null);
    }
  }

  const groups = [
    { key: "pwned", icon: Skull, title: "Found in data breaches", hint: scanned ? "Change these right away" : "Run a breach scan to check", items: audit.pwned, scanned },
    { key: "weak", icon: ShieldAlert, title: "Weak passwords", hint: "Easy to guess or brute-force", items: audit.weak, scanned: true },
    { key: "reused", icon: Copy, title: "Reused passwords", hint: "One breach exposes multiple accounts", items: audit.reused, scanned: true },
    { key: "stale", icon: Clock, title: `Not changed in ${STALE_DAYS}+ days`, hint: "Consider rotating these", items: audit.stale, scanned: true },
  ];

  return (
    <div className="space-y-5">
      <div className="glass flex items-center gap-5 rounded-3xl p-5 sm:p-6">
        <div className="grid size-24 shrink-0 place-items-center rounded-full border-4 text-3xl font-bold" style={{ borderColor: tone, color: tone, boxShadow: `0 0 30px ${tone}33` }}>{audit.score}</div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Vault health</h2>
          <p className="text-sm text-white/55">
            {audit.total === 0 ? "Add logins to see your security score." : audit.score === 100 ? "Everything looks great." : "Fix the items below to raise your score."}
          </p>
        </div>
      </div>

      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <ScanSearch className="size-5 text-lime-300" />
        <p className="min-w-0 flex-1 text-sm text-white/65">Check every password against 800M+ breached passwords. Only a 5-character hash prefix is sent, never the password.</p>
        <button className="btn btn-primary !py-2" disabled={progress !== null || audit.total === 0} onClick={scan}>
          {progress !== null ? <><Loader2 className="size-4 animate-spin" /> {progress}/{audit.total}</> : scanned ? "Scan again" : "Scan for breaches"}
        </button>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="glass rounded-2xl p-5">
          <header className="mb-3 flex items-center gap-3">
            <g.icon className={`size-5 ${g.items.length ? "text-amber-300" : "text-lime-300"}`} />
            <div className="flex-1">
              <h3 className="font-semibold">{g.title}</h3>
              <p className="text-xs text-white/45">{g.hint}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-semibold">{g.items.length}</span>
          </header>
          {g.items.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-lime-300"><ShieldCheck className="size-4" /> {g.scanned ? "All clear" : "Not scanned yet"}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {g.items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate">{c.title} <span className="text-white/40">· {c.username}</span></span>
                  <button className="btn btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => onEdit(c)}>Fix</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
