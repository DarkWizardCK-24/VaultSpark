"use client";

import { motion } from "framer-motion";
import { Download, KeyRound } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "../ui/CopyButton";

/** Shown once after setup / regeneration. The key can never be displayed again. */
export function RecoveryKeyModal({ recoveryKey, onDone }: { recoveryKey: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);

  function download() {
    const body = `VaultSpark recovery key\n\n${recoveryKey}\n\nKeep this somewhere safe and offline. Anyone with this key AND access to your account can open your vault.\nIt is the only way back in if you forget your master password.\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vaultspark-recovery-key.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-end bg-black/80 backdrop-blur-sm sm:place-items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Your recovery key"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="glass w-full max-w-lg space-y-5 rounded-t-3xl bg-[#0a110f] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-300 via-lime-300 to-amber-300 text-[#04130d]"><KeyRound className="size-6" /></span>
          <div>
            <h2 className="text-xl font-bold">Save your recovery key</h2>
            <p className="text-sm text-white/55">Shown only once. It’s your spare key.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-lime-300/25 bg-black/50 p-4 text-center font-mono text-[15px] font-semibold leading-8 tracking-wider text-lime-200 break-all sm:text-base" data-testid="recovery-key">
          {recoveryKey}
        </div>

        <div className="flex gap-2">
          <CopyButton text={recoveryKey} secret label="Recovery key copied" className="btn btn-ghost flex-1" title="Copy recovery key">Copy</CopyButton>
          <button type="button" onClick={download} className="btn btn-ghost flex-1"><Download className="size-4" /> Download</button>
        </div>

        <p className="text-sm leading-relaxed text-white/55">
          If you forget your master password, this key is the <b className="text-white/80">only</b> way to get your passwords back. We can’t reset it for you. Store it offline (printed, or in a safe place), not in your email.
        </p>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/80">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-lime-300" />
          I’ve saved my recovery key somewhere safe.
        </label>
        <button disabled={!saved} onClick={onDone} className="btn btn-primary w-full !py-3.5">Continue to my vault</button>
      </motion.div>
    </motion.div>
  );
}
