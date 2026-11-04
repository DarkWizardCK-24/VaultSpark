"use client";

import { Download, FileUp, Fingerprint, KeyRound, Loader2, Lock, Smartphone, Trash2 } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useVault } from "@/context/VaultContext";
import { importFromCsv } from "@/lib/csv";
import { passkeySupported } from "@/lib/passkey";
import { useAuth } from "@/context/AuthContext";
import { analyzePassword, masterPasswordIssue } from "@/lib/strength";
import { PasswordField } from "../ui/PasswordField";
import { canInstall, promptInstall, subscribeInstall } from "../ui/PwaSetup";
import { StrengthBar } from "../ui/StrengthMeter";
import { RecoveryKeyModal } from "./RecoveryKeyModal";

function Section({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-300/10 text-lime-300"><Icon className="size-5" /></span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-white/50">{desc}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsPanel() {
  const v = useVault();
  const [newKey, setNewKey] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <RecoverySection onKey={setNewKey} />
      <MasterSection />
      <PasskeySection />
      <DataSection />
      <InstallSection />
      <p className="px-2 pb-4 text-center text-xs text-white/30">
        {v.credentials.length} items · auto-locks after 5 minutes of inactivity · clipboard clears after 30 s
      </p>
      {newKey && <RecoveryKeyModal recoveryKey={newKey} onDone={() => setNewKey(null)} />}
    </div>
  );
}

function RecoverySection({ onKey }: { onKey: (k: string) => void }) {
  const { hasRecovery, regenerateRecovery } = useVault();
  const [busy, setBusy] = useState(false);
  return (
    <Section icon={KeyRound} title="Recovery key" desc="Your spare key. If you forget your master password, it’s the only way back in.">
      <p className="text-sm text-white/70">{hasRecovery ? "A recovery key is active." : "No recovery key yet. Create one now."}</p>
      <button
        disabled={busy}
        className="btn btn-ghost"
        onClick={async () => {
          if (hasRecovery && !window.confirm("This invalidates your old recovery key. Continue?")) return;
          setBusy(true);
          try {
            onKey(await regenerateRecovery());
          } catch {
            toast.error("Couldn’t create a recovery key.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {hasRecovery ? "Generate a new recovery key" : "Create recovery key"}
      </button>
    </Section>
  );
}

function MasterSection() {
  const { changeMaster } = useVault();
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);
  const r = analyzePassword(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const issue = masterPasswordIssue(next, user?.email ?? "");
    if (issue) return toast.error(issue);
    if (next !== conf) return toast.error("New passwords don’t match.");
    setBusy(true);
    try {
      if (await changeMaster(cur, next)) {
        toast.success("Master password changed.");
        setCur(""); setNext(""); setConf("");
      } else toast.error("Current master password is incorrect.");
    } catch {
      toast.error("Couldn’t change it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={Lock} title="Change master password" desc="Swap the password that opens your vault. Your saved items stay exactly as they are.">
      <form onSubmit={submit} className="space-y-3">
        <PasswordField value={cur} onChange={setCur} placeholder="Current master password" />
        <PasswordField value={next} onChange={setNext} placeholder="New master password" />
        {next && <div><StrengthBar result={r} /><p className="mt-1 text-xs" style={{ color: r.color }}>{r.level}</p></div>}
        <PasswordField value={conf} onChange={setConf} placeholder="Confirm new master password" />
        <button disabled={busy || !cur || !next} className="btn btn-primary">{busy && <Loader2 className="size-4 animate-spin" />}Change password</button>
      </form>
    </Section>
  );
}

function PasskeySection() {
  const { passkeys, addPasskey, removePasskey } = useVault();
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && passkeySupported();
  return (
    <Section icon={Fingerprint} title="Passkey & biometric unlock" desc="Open your vault with Face ID, a fingerprint or Windows Hello instead of typing the master password.">
      {!supported && <p className="text-sm text-amber-200/80">This browser doesn’t support passkeys.</p>}
      {passkeys.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2.5 text-sm">
          <Fingerprint className="size-4 text-lime-300" />
          <span className="flex-1 truncate">{p.label}<span className="ml-2 text-xs text-white/35">added {new Date(p.createdAt).toLocaleDateString()}</span></span>
          <button aria-label="Remove passkey" className="btn btn-danger !px-2.5 !py-1.5" onClick={() => window.confirm("Remove this passkey?") && removePasskey(p.id)}><Trash2 className="size-3.5" /></button>
        </div>
      ))}
      <button
        disabled={!supported || busy}
        className="btn btn-ghost"
        onClick={async () => {
          setBusy(true);
          try {
            const label = (navigator.platform || "This device").replace(/^Win32$/, "Windows").trim() || "This device";
            await addPasskey(label);
            toast.success("Passkey added. You can now unlock with it.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn’t add the passkey.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}Add passkey on this device
      </button>
    </Section>
  );
}

function DataSection() {
  const { exportBackup, importBackup, importCredentials, credentials } = useVault();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPw, setImportPw] = useState("");

  async function doExport() {
    if (pw.length < 8) return toast.error("Choose a backup password of at least 8 characters.");
    setBusy(true);
    try {
      const url = URL.createObjectURL(new Blob([await exportBackup(pw)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultspark-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Encrypted backup saved (${credentials.length} items).`);
      setPw("");
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".csv") || !text.trim().startsWith("{")) {
        const res = importFromCsv(text);
        if (!res || res.items.length === 0) return toast.error("Couldn’t find any logins in that CSV.");
        if (!window.confirm(`Import ${res.items.length} items from ${res.source}?${res.skipped ? ` (${res.skipped} skipped)` : ""}\n\nDelete the CSV afterwards, it contains passwords in plain text.`)) return;
        toast.success(`Imported ${await importCredentials(res.items)} items from ${res.source}.`);
      } else {
        const n = await importBackup(text, importPw);
        if (n === null) return toast.error("Wrong backup password, or not a VaultSpark backup.");
        toast.success(`Restored ${n} items from backup.`);
      }
    } catch {
      toast.error("Import failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Section icon={Download} title="Backup & import" desc="Take your passwords with you, or bring them in from another manager.">
      <div className="space-y-3">
        <p className="label !mb-0">Export encrypted backup</p>
        <PasswordField value={pw} onChange={setPw} placeholder="Choose a backup password" />
        <button disabled={busy || !credentials.length} className="btn btn-ghost" onClick={doExport}><Download className="size-4" />Download backup</button>
      </div>
      <hr className="border-white/8" />
      <div className="space-y-3">
        <p className="label !mb-0">Import</p>
        <p className="text-sm text-white/50">Accepts a VaultSpark backup (<code>.json</code>) or a CSV from Chrome / Edge, Bitwarden or 1Password.</p>
        <PasswordField value={importPw} onChange={setImportPw} placeholder="Backup password (only for .json backups)" />
        <input ref={fileRef} type="file" accept=".json,.csv,text/csv,application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        <button disabled={busy} className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}Choose file
        </button>
      </div>
    </Section>
  );
}

function InstallSection() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  return (
    <Section icon={Smartphone} title="Install the app" desc="Add VaultSpark to your home screen. It opens full-screen and works offline with your last-synced (still encrypted) data.">
      {installable ? (
        <button className="btn btn-primary" onClick={() => promptInstall()}>Install VaultSpark</button>
      ) : (
        <p className="text-sm text-white/55">
          Already installed, or your browser uses its own menu: on iPhone tap <b>Share → Add to Home Screen</b>; on Android/desktop Chrome use <b>⋮ → Install app</b>.
        </p>
      )}
    </Section>
  );
}
