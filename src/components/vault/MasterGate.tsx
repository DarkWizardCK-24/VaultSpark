"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Fingerprint, Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";
import { passkeySupported } from "@/lib/passkey";
import { analyzePassword, masterPasswordIssue } from "@/lib/strength";
import { PasswordField } from "../ui/PasswordField";
import { StrengthBar } from "../ui/StrengthMeter";

/** First-time master-password creation, unlock (password / passkey) and recovery-key reset. */
export function MasterGate({ mode, onRecoveryKey }: { mode: "setup" | "unlock"; onRecoveryKey?: (key: string) => void }) {
  const { user, logout } = useAuth();
  const { setupVault, unlock, unlockWithRecovery, unlockWithPasskey, hasPasskey, hasRecovery } = useVault();
  const [view, setView] = useState<"main" | "recover">("main");
  const [master, setMaster] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => analyzePassword(master), [master]);
  const isSetup = mode === "setup";
  const recovering = view === "recover";
  const needsNew = isSetup || recovering;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (needsNew) {
      const issue = masterPasswordIssue(master, user?.email ?? "");
      if (issue) return setError(issue);
      if (master !== confirm) return setError("Passwords don’t match.");
    }
    if (isSetup && !ack) return setError("Please confirm you understand the recovery rules.");
    setBusy(true);
    try {
      if (isSetup) {
        const key = await setupVault(master);
        onRecoveryKey?.(key);
      } else if (recovering) {
        if (!(await unlockWithRecovery(recoveryKey, master))) return setError("That recovery key doesn’t match this vault.");
        toast.success("Master password reset. Welcome back!");
      } else if (!(await unlock(master))) {
        setError("Incorrect master password.");
        setMaster("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setError("");
    try {
      if (!(await unlockWithPasskey())) setError("Passkey unlock didn’t work. Use your master password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh flex-1 place-items-end px-0 sm:place-items-center sm:px-5">
      <motion.form
        onSubmit={submit}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        className="glass w-full max-w-md space-y-5 rounded-t-[2rem] bg-[#0a110f]/80 p-7 pb-[max(2rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-8"
      >
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="mx-auto size-16 rounded-[24%] shadow-[0_14px_40px_-10px_rgb(163_230_53/0.55)]" />
          <h1 className="mt-4 text-2xl font-bold">{isSetup ? "Create your master password" : recovering ? "Reset with recovery key" : "Unlock your vault"}</h1>
          <p className="mt-1 text-sm text-white/55">
            {isSetup ? "This password encrypts everything. It never leaves your device." : recovering ? "Enter the key you saved, then choose a new master password." : `Signed in as ${user?.email ?? "you"}`}
          </p>
        </div>

        {recovering && (
          <div>
            <label className="label" htmlFor="rk">Recovery key</label>
            <textarea id="rk" rows={2} value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-…" spellCheck={false} autoCapitalize="characters" className="field resize-none font-mono !text-sm" />
          </div>
        )}

        <PasswordField value={master} onChange={setMaster} placeholder={needsNew ? "New master password" : "Master password"} autoFocus={!recovering} autoComplete="off" />

        <AnimatePresence initial={false}>
          {needsNew && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-5 overflow-hidden">
              <div>
                <StrengthBar result={result} empty={!master} />
                <div className="mt-1.5 text-xs text-white/50">{master ? <span style={{ color: result.color }}>{result.level}</span> : "Min. 12 characters and “Strong”. Tip: 4 random words works great."}</div>
              </div>
              <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm master password" />
            </motion.div>
          )}
        </AnimatePresence>

        {isSetup && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-sm text-amber-100/90">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-lime-300" />
            <span className="flex gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />I understand VaultSpark can’t reset this for me. Next, I’ll get a recovery key to store safely.</span>
          </label>
        )}

        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

        <button disabled={busy || !master || (recovering && !recoveryKey)} className="btn btn-primary w-full !py-3.5 !text-base">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {isSetup ? "Create vault" : recovering ? "Reset & unlock" : <><LockKeyhole className="size-4" /> Unlock</>}
        </button>

        {!isSetup && !recovering && hasPasskey && passkeySupported() && (
          <button type="button" disabled={busy} onClick={passkey} className="btn btn-ghost w-full !py-3.5"><Fingerprint className="size-5" /> Unlock with passkey / biometrics</button>
        )}

        <div className="flex items-center justify-between text-xs text-white/45">
          {recovering ? (
            <button type="button" onClick={() => { setView("main"); setError(""); }} className="flex items-center gap-1 hover:text-white"><ArrowLeft className="size-3" /> Back</button>
          ) : !isSetup && hasRecovery ? (
            <button type="button" onClick={() => { setView("recover"); setError(""); setMaster(""); }} className="hover:text-white">Forgot master password?</button>
          ) : <span />}
          <button type="button" onClick={logout} className="hover:text-white">Sign out</button>
        </div>
      </motion.form>
    </div>
  );
}
