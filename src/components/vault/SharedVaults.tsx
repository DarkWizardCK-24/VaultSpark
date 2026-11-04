"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Fingerprint, Loader2, MailCheck, Plus, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useShared, useSharedItems, type SharedVault } from "@/context/SharedContext";
import { useVault } from "@/context/VaultContext";
import type { Credential } from "@/lib/types";
import { toInput } from "@/lib/items";
import { CredentialCard } from "./CredentialCard";
import { CredentialModal } from "./CredentialModal";

export function SharedVaults() {
  const { vaults, ready, createVault } = useShared();
  const { sharingFingerprint } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const open = vaults.find((v) => v.id === openId);

  if (open) return <SharedVaultView vault={open} onBack={() => setOpenId(null)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Shared vaults</h1>
        <p className="mt-1 text-sm text-white/55">Share logins with family or a team. Each vault has its own encryption key, handed to members privately. We can’t read any of it.</p>
      </div>

      <VerifyBanner />
      {sharingFingerprint && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/55">
          <Fingerprint className="size-4 text-lime-300" /> Your sharing fingerprint:
          <code className="font-mono text-sm text-lime-200" data-testid="my-fingerprint">{sharingFingerprint}</code>
          <span className="basis-full text-white/40">Read it to people who invite you, so they can confirm it’s really you.</span>
        </p>
      )}

      <form
        className="glass flex gap-2 rounded-2xl p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await createVault(name.trim());
            setName("");
            toast.success("Shared vault created");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn’t create the vault.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="New vault name (e.g. Family Wi-Fi & streaming)" className="field !text-base" aria-label="Vault name" />
        <button disabled={busy || !name.trim()} aria-label="Create shared vault" className="btn btn-primary shrink-0">{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}<span className="hidden sm:inline">Create</span></button>
      </form>

      {!ready ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-lime-300" /></div>
      ) : vaults.length === 0 ? (
        <div className="glass grid place-items-center rounded-3xl px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-300/15 to-amber-300/15"><Users className="size-8 text-lime-200/70" /></span>
          <h2 className="mt-4 text-lg font-semibold">No shared vaults yet</h2>
          <p className="mt-1 max-w-xs text-sm text-white/50">Create one above, then invite people by email. They need a VaultSpark account.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {vaults.map((v) => (
            <li key={v.id}>
              <button onClick={() => setOpenId(v.id)} className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:border-white/25 active:scale-[0.99]">
                <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-teal-300/20 to-amber-300/20 text-lime-200"><Users className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{v.name}</span>
                  <span className="text-xs text-white/45">{v.memberUids.length} member{v.memberUids.length === 1 ? "" : "s"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SharedVaultView({ vault, onBack }: { vault: SharedVault; onBack: () => void }) {
  const { user } = useAuth();
  const { lookupMember, inviteMember, removeMember, deleteVault } = useShared();
  const { items, add, update, remove } = useSharedItems(vault);
  const [editing, setEditing] = useState<Credential | "new" | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = vault.ownerUid === user?.uid;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="grid size-10 place-items-center rounded-full bg-white/8 active:scale-95"><ArrowLeft className="size-5" /></button>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{vault.name}</h1>
        <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus className="size-4" /> Add</button>
      </div>

      <section className="glass rounded-2xl p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Users className="size-4 text-lime-300" /> Members</h2>
        <ul className="divide-y divide-white/5 text-sm">
          {vault.memberUids.map((m) => (
            <li key={m} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate">{vault.members[m]?.email ?? m}{m === user?.uid && <span className="ml-2 text-xs text-white/35">you</span>}</span>
              {m === vault.ownerUid ? (
                <span className="flex items-center gap-1 text-xs text-amber-300"><Crown className="size-3.5" /> Owner</span>
              ) : (
                isOwner && (
                  <button
                    aria-label={`Remove ${vault.members[m]?.email}`}
                    className="btn btn-danger !px-2.5 !py-1.5"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Remove ${vault.members[m]?.email}? The vault will be re-encrypted with a new key.`)) return;
                      setBusy(true);
                      try {
                        await removeMember(vault, m);
                        toast.success("Member removed and vault re-keyed");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Couldn’t remove the member.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <UserMinus className="size-3.5" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const member = await lookupMember(email);
                if (!window.confirm(`Add ${member.email}?

Their sharing fingerprint:
${member.fingerprint}

Only continue if it matches the fingerprint shown in THEIR Shared tab.`)) return;
                await inviteMember(vault, member);
                setEmail("");
                toast.success("Member added");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn’t add that person.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email" className="field !text-base" aria-label="Invite by email" />
            <button disabled={busy} aria-label="Invite member" className="btn btn-ghost shrink-0">{busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}<span className="hidden sm:inline">Invite</span></button>
          </form>
        )}
      </section>

      {items.length === 0 ? (
        <div className="glass rounded-3xl px-6 py-12 text-center text-sm text-white/50">This vault is empty. Add the first shared item.</div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((c) => (
              <CredentialCard
                key={c.id}
                cred={c}
                onEdit={() => setEditing(c)}
                onDelete={async () => window.confirm(`Delete “${c.title}” for everyone?`) && (await remove(c.id), toast.success("Deleted"))}
                onFavorite={() => update(c.id, { ...toInput(c), favorite: !c.favorite })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {isOwner && (
        <button
          className="btn btn-danger w-full"
          onClick={async () => {
            if (!window.confirm(`Delete the shared vault “${vault.name}” and everything in it for all members?`)) return;
            await deleteVault(vault);
            toast.success("Vault deleted");
            onBack();
          }}
        >
          <Trash2 className="size-4" /> Delete this vault
        </button>
      )}

      <CredentialModal editing={editing} onClose={() => setEditing(null)} onSave={(input, id) => (id ? update(id, input) : add(input))} />
    </div>
  );
}

/** Email must be verified before your public key can be published (prevents others impersonating your email). */
function VerifyBanner() {
  const { emailVerified, resendVerification, refreshVerification } = useAuth();
  const [busy, setBusy] = useState(false);
  if (emailVerified) return null;
  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl border-amber-400/30 p-4 text-sm text-amber-100">
      <MailCheck className="size-5 shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1">Verify your email to be invitable to shared vaults. We’ve sent you a link.</p>
      <button disabled={busy} className="btn btn-ghost !py-2" onClick={async () => { setBusy(true); try { await resendVerification(); toast.success("Verification email sent"); } catch { toast.error("Couldn’t send it. Try again shortly."); } finally { setBusy(false); } }}>Resend</button>
      <button disabled={busy} className="btn btn-primary !py-2" onClick={async () => { setBusy(true); try { if (await refreshVerification()) toast.success("Email verified"); else toast.error("Not verified yet."); } finally { setBusy(false); } }}>I’ve verified</button>
    </div>
  );
}
