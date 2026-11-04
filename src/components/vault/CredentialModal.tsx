"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Dices, Globe, History, Loader2, ShieldAlert, ShieldCheck, StickyNote, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { breachCount } from "@/lib/breach";
import { DEFAULT_OPTIONS, generatePassword } from "@/lib/generator";
import { toInput } from "@/lib/items";
import { safeHttpUrl } from "@/lib/url";
import { PLATFORMS } from "@/lib/platforms";
import { analyzePassword } from "@/lib/strength";
import { parseTotp } from "@/lib/totp";
import { CATEGORIES, EMPTY_INPUT, type Category, type Credential, type CredentialInput, type ItemType } from "@/lib/types";
import { PasswordGenerator } from "../PasswordGenerator";
import { CopyButton } from "../ui/CopyButton";
import { PasswordField } from "../ui/PasswordField";
import { StrengthBar } from "../ui/StrengthMeter";

const TYPES: { id: ItemType; label: string; icon: React.ElementType }[] = [
  { id: "login", label: "Login", icon: Globe },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "note", label: "Note", icon: StickyNote },
];

interface Props {
  editing: Credential | "new" | null;
  onClose: () => void;
  /** Persist the item. `id` is set when editing. */
  onSave: (input: CredentialInput, id?: string) => Promise<void>;
}

export function CredentialModal({ editing, onClose, onSave }: Props) {
  return (
    <AnimatePresence>
      {editing && <ModalBody key={editing === "new" ? "new" : editing.id} editing={editing} onClose={onClose} onSave={onSave} />}
    </AnimatePresence>
  );
}

const normalizeUrl = safeHttpUrl;

function ModalBody({ editing, onClose, onSave }: Required<Props>) {
  const existing = editing === "new" ? null : editing;
  const [form, setForm] = useState<CredentialInput>(existing ? toInput(existing) : EMPTY_INPUT);
  const [busy, setBusy] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [breach, setBreach] = useState<{ state: "idle" | "checking" | "safe" | "pwned" | "error"; count?: number }>({ state: "idle" });
  const result = useMemo(() => analyzePassword(form.password), [form.password]);
  const set = <K extends keyof CredentialInput>(k: K, v: CredentialInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "password") setBreach({ state: "idle" });
  };
  const setCard = (k: keyof CredentialInput["card"], v: string) => setForm((f) => ({ ...f, card: { ...f.card, [k]: v } }));

  async function checkBreach() {
    setBreach({ state: "checking" });
    try {
      const count = await breachCount(form.password);
      setBreach(count > 0 ? { state: "pwned", count } : { state: "safe" });
    } catch {
      setBreach({ state: "error" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.totpSecret && !parseTotp(form.totpSecret)) return toast.error("That 2FA secret isn’t valid. Paste the base32 key or an otpauth:// link.");
    setBusy(true);
    try {
      await onSave({ ...form, url: normalizeUrl(form.url) }, existing?.id);
      toast.success(existing ? "Updated" : "Saved");
      onClose();
    } catch {
      toast.error("Couldn’t save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = form.type === "login";

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Edit item" : "Add item"}
        className="glass max-h-[94dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl bg-[#0a110f] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[92vh] sm:rounded-3xl sm:p-6"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{existing ? "Edit item" : "Add item"}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="size-5" /></button>
        </div>

        {!existing && (
          <div role="tablist" aria-label="Item type" className="grid grid-cols-3 rounded-2xl bg-black/40 p-1">
            {TYPES.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={form.type === t.id} onClick={() => set("type", t.id)} className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${form.type === t.id ? "text-[#04130d]" : "text-white/55"}`}>
                {form.type === t.id && <motion.span layoutId="type-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-300 to-lime-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <t.icon className="relative size-4" /> <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {isLogin && !existing && (
          <div>
            <p className="label">Quick pick</p>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {PLATFORMS.map((p) => (
                <button key={p.name} type="button" onClick={() => setForm((f) => ({ ...f, title: p.name, url: p.url, category: p.category }))} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${form.title === p.name ? "border-lime-300/60 bg-lime-300/10 text-lime-100" : "border-white/10 bg-white/5 text-white/70"}`}>
                  <span aria-hidden className="grid size-5 place-items-center rounded-md text-[11px] font-bold" style={{ background: p.color, color: p.text ?? "#fff" }}>{p.name[0]}</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="c-title">Title</label>
            <input id="c-title" required className="field !text-base" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={isLogin ? "Instagram" : form.type === "card" ? "Visa ending 4242" : "Wi-Fi codes"} />
          </div>
          <div>
            <label className="label" htmlFor="c-cat">Category</label>
            <select id="c-cat" className="field !text-base" value={form.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0a110f]">{c}</option>)}
            </select>
          </div>
        </div>

        {isLogin && (
          <>
            <div>
              <label className="label" htmlFor="c-user">Username / email</label>
              <input id="c-user" required className="field !text-base" autoComplete="off" autoCapitalize="none" value={form.username} onChange={(e) => set("username", e.target.value)} />
            </div>

            <div>
              <label className="label" htmlFor="c-pw">Password</label>
              <PasswordField
                id="c-pw"
                icon={false}
                value={form.password}
                onChange={(v) => set("password", v)}
                right={<button type="button" onClick={() => set("password", generatePassword(DEFAULT_OPTIONS))} className="grid size-8 place-items-center rounded-lg text-lime-300 hover:bg-white/10" title="Generate strong password" aria-label="Generate strong password"><Dices className="size-4" /></button>}
              />
              <div className="mt-2"><StrengthBar result={result} empty={!form.password} /></div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
                <span style={{ color: form.password ? result.color : undefined }}>{form.password ? result.level : ""}</span>
                <span className="flex items-center gap-3">
                  <button type="button" disabled={!form.password || breach.state === "checking"} className="text-lime-300 hover:underline disabled:opacity-40" onClick={checkBreach}>
                    {breach.state === "checking" ? "Checking…" : "Check for breaches"}
                  </button>
                  <button type="button" className="text-lime-300 hover:underline" onClick={() => setShowGen((s) => !s)}>{showGen ? "Hide generator" : "Customise generator"}</button>
                </span>
              </div>
              {breach.state === "safe" && <p className="mt-2 flex items-center gap-2 text-sm text-lime-300"><ShieldCheck className="size-4" /> Not found in any known data breach.</p>}
              {breach.state === "pwned" && <p className="mt-2 flex items-start gap-2 text-sm text-rose-300"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> Seen in data breaches {breach.count?.toLocaleString()} times. Pick a different password.</p>}
              {breach.state === "error" && <p className="mt-2 text-sm text-amber-300">Couldn’t reach the breach service. Try again later.</p>}
              {showGen && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <PasswordGenerator compact onUse={(pw) => { set("password", pw); setShowGen(false); }} />
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="c-url">Website</label>
              <input id="c-url" className="field !text-base" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="instagram.com" inputMode="url" autoCapitalize="none" />
            </div>

            <div>
              <label className="label" htmlFor="c-totp">2FA secret <span className="normal-case tracking-normal text-white/30">(optional)</span></label>
              <PasswordField id="c-totp" icon={false} value={form.totpSecret} onChange={(v) => set("totpSecret", v)} placeholder="Base32 key or otpauth:// link" />
              <p className="mt-1.5 text-xs text-white/40">Paste the “setup key” a site shows next to its QR code and VaultSpark will generate the 6-digit codes.</p>
            </div>
          </>
        )}

        {form.type === "card" && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="k-holder">Name on card</label>
              <input id="k-holder" className="field !text-base" autoComplete="off" value={form.card.holder} onChange={(e) => setCard("holder", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="k-num">Card number</label>
              <input id="k-num" className="field font-mono !text-base" inputMode="numeric" autoComplete="off" value={form.card.number} onChange={(e) => setCard("number", e.target.value.replace(/[^\d ]/g, "").slice(0, 23))} placeholder="1234 5678 9012 3456" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="k-exp">Expiry</label>
                <input id="k-exp" className="field font-mono !text-base" inputMode="numeric" autoComplete="off" value={form.card.expiry} onChange={(e) => setCard("expiry", e.target.value.slice(0, 5))} placeholder="MM/YY" />
              </div>
              <div>
                <label className="label" htmlFor="k-cvv">CVV</label>
                <PasswordField id="k-cvv" icon={false} value={form.card.cvv} onChange={(v) => setCard("cvv", v.replace(/\D/g, "").slice(0, 4))} placeholder="•••" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="c-notes">{form.type === "note" ? "Note" : "Notes"}</label>
          <textarea id="c-notes" rows={form.type === "note" ? 8 : 3} required={form.type === "note"} className="field resize-none !text-base" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={form.type === "note" ? "Anything private. Encrypted just like passwords." : "Recovery codes, security answers…"} />
        </div>

        {existing && existing.history.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/25">
            <button type="button" onClick={() => setShowHistory((s) => !s)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-white/80">
              <History className="size-4 text-lime-300" /> Password history <span className="text-white/40">({existing.history.length})</span>
              <span className="ml-auto text-xs text-lime-300">{showHistory ? "Hide" : "Show"}</span>
            </button>
            {showHistory && (
              <ul className="divide-y divide-white/5 border-t border-white/5">
                {existing.history.map((h) => (
                  <li key={h.changedAt} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-white/80">{h.password}</span>
                      <span className="text-[11px] text-white/35">replaced {new Date(h.changedAt).toLocaleDateString()}</span>
                    </span>
                    <CopyButton text={h.password} secret label="Old password copied" title="Copy" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" />
                    <button type="button" className="btn btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => { set("password", h.password); toast.success("Restored, save to apply"); }}>Restore</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" className="btn btn-ghost flex-1 !py-3" onClick={onClose}>Cancel</button>
          <button disabled={busy} className="btn btn-primary flex-1 !py-3">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {existing ? "Update" : "Save"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
