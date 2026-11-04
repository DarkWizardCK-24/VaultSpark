"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  decryptJSON,
  encryptJSON,
  fingerprintOfJwk,
  generateDek,
  importPublicJwk,
  unwrapKeyWith,
  wrapKeyFor,
  type Sealed,
} from "@/lib/crypto";
import { getFirebase } from "@/lib/firebase";
import { nextPayload, normalizePayload, type Payload } from "@/lib/items";
import type { Credential, CredentialInput } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { useVault } from "./VaultContext";

export interface SharedVault {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  members: Record<string, { email: string; wrappedKey: string }>;
  keyVersion: number;
  key: CryptoKey;
}

export interface DirectoryEntry {
  uid: string;
  email: string;
  jwk: JsonWebKey;
  /** Safety number, compare with what the invitee sees in their own Shared tab. */
  fingerprint: string;
}

interface SharedState {
  vaults: SharedVault[];
  ready: boolean;
  createVault: (name: string) => Promise<void>;
  lookupMember: (email: string) => Promise<DirectoryEntry>;
  inviteMember: (vault: SharedVault, member: DirectoryEntry) => Promise<void>;
  removeMember: (vault: SharedVault, memberUid: string) => Promise<void>;
  deleteVault: (vault: SharedVault) => Promise<void>;
}

interface VaultDocData {
  ownerUid: string;
  memberUids: string[];
  members: SharedVault["members"];
  nameSealed: Sealed;
  keyVersion: number;
  createdAt: number;
}

interface ItemDoc extends Sealed {
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  keyVersion: number;
}

const SharedContext = createContext<SharedState | null>(null);
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export function SharedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { status, getKeys } = useVault();
  const uid = user?.uid;
  const [vaults, setVaults] = useState<SharedVault[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset when the vault locks / user changes */
    if (!uid || status !== "unlocked") {
      setVaults([]);
      setReady(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    // The RSA key pair is created asynchronously right after unlock; wait for it.
    const wait = setInterval(() => {
      const keys = getKeys();
      if (!keys || cancelled) return;
      clearInterval(wait);
      unsub = onSnapshot(
        query(collection(getFirebase().db, "sharedVaults"), where("memberUids", "array-contains", uid)),
        async (snap) => {
          const rows = await Promise.all(
            snap.docs.map(async (d) => {
              const data = d.data() as VaultDocData;
              try {
                const key = await unwrapKeyWith(data.members[uid].wrappedKey, keys.privateKey);
                const name = await decryptJSON<string>(key, data.nameSealed);
                return { id: d.id, name, ownerUid: data.ownerUid, memberUids: data.memberUids, members: data.members, keyVersion: data.keyVersion, key } as SharedVault;
              } catch {
                return null;
              }
            }),
          );
          if (cancelled) return;
          setVaults(rows.filter((r): r is SharedVault => r !== null).sort((a, b) => a.name.localeCompare(b.name)));
          setReady(true);
        },
        () => setReady(true),
      );
    }, 250);
    return () => {
      cancelled = true;
      clearInterval(wait);
      unsub?.();
    };
  }, [uid, status, getKeys]);

  const createVault = useCallback(
    async (name: string) => {
      const keys = getKeys();
      if (!uid || !keys) throw new Error("Sharing keys are still being prepared, try again in a moment.");
      const key = await generateDek();
      const data: VaultDocData = {
        ownerUid: uid,
        memberUids: [uid],
        members: { [uid]: { email: (user?.email ?? "").toLowerCase(), wrappedKey: await wrapKeyFor(key, keys.publicKey) } },
        nameSealed: await encryptJSON(key, name),
        keyVersion: 1,
        createdAt: Date.now(),
      };
      await addDoc(collection(getFirebase().db, "sharedVaults"), data);
    },
    [uid, user?.email, getKeys],
  );

  const lookupMember = useCallback(async (email: string): Promise<DirectoryEntry> => {
    const e = email.trim().toLowerCase();
    if (!e || e.includes("/")) throw new Error("Enter a valid email address.");
    const snap = await getDoc(doc(getFirebase().db, "publicKeys", e));
    if (!snap.exists()) throw new Error("No verified VaultSpark user with that email. They need to sign up, verify their email and unlock their vault once.");
    const d = snap.data() as { uid: string; jwk: JsonWebKey };
    return { uid: d.uid, email: e, jwk: d.jwk, fingerprint: await fingerprintOfJwk(d.jwk) };
  }, []);

  const inviteMember = useCallback(async (vault: SharedVault, member: DirectoryEntry) => {
    if (vault.memberUids.includes(member.uid)) throw new Error("They’re already a member.");
    const pub = await importPublicJwk(member.jwk);
    await updateDoc(doc(getFirebase().db, "sharedVaults", vault.id), {
      memberUids: arrayUnion(member.uid),
      [`members.${member.uid}`]: { email: member.email, wrappedKey: await wrapKeyFor(vault.key, pub) },
    });
  }, []);

  /**
   * Removing someone rotates the vault key and re-encrypts everything so the removed member's old key is useless.
   * Items and the vault document are changed in ONE atomic batch: it either fully happens or not at all,
   * so a dropped connection can never leave items encrypted under a key nobody holds.
   */
  const removeMember = useCallback(
    async (vault: SharedVault, memberUid: string) => {
      const { db } = getFirebase();
      const keys = getKeys();
      if (!uid || !keys) throw new Error("Sharing keys aren’t ready yet.");
      const newKey = await generateDek();
      const remaining = vault.memberUids.filter((m) => m !== memberUid);
      const members: SharedVault["members"] = {};
      for (const m of remaining) {
        let pub: CryptoKey;
        if (m === uid) pub = keys.publicKey;
        else {
          const snap = await getDoc(doc(db, "publicKeys", vault.members[m].email));
          const d = snap.exists() ? (snap.data() as { uid: string; jwk: JsonWebKey }) : null;
          if (!d || d.uid !== m) throw new Error(`Couldn’t verify ${vault.members[m].email}’s key; aborting so nothing is lost.`);
          pub = await importPublicJwk(d.jwk);
        }
        members[m] = { email: vault.members[m].email, wrappedKey: await wrapKeyFor(newKey, pub) };
      }
      const items = await getDocs(collection(db, "sharedVaults", vault.id, "items"));
      if (items.size > 400) throw new Error("This vault has too many items to re-key in one safe step. Split it first.");
      const version = vault.keyVersion + 1;
      const batch = writeBatch(db);
      for (const d of items.docs) {
        const payload = await decryptJSON<Payload>(vault.key, d.data() as ItemDoc); // throws → abort, nothing written
        batch.update(d.ref, { ...(await encryptJSON(newKey, payload)), keyVersion: version, updatedBy: uid });
      }
      batch.update(doc(db, "sharedVaults", vault.id), {
        memberUids: remaining,
        members,
        nameSealed: await encryptJSON(newKey, vault.name),
        keyVersion: version,
      });
      await batch.commit();
    },
    [uid, getKeys],
  );

  const deleteVault = useCallback(async (vault: SharedVault) => {
    const { db } = getFirebase();
    const items = await getDocs(collection(db, "sharedVaults", vault.id, "items"));
    for (const part of chunk(items.docs, 15)) {
      const batch = writeBatch(db);
      part.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, "sharedVaults", vault.id));
  }, []);

  const value = useMemo(
    () => ({ vaults, ready, createVault, lookupMember, inviteMember, removeMember, deleteVault }),
    [vaults, ready, createVault, lookupMember, inviteMember, removeMember, deleteVault],
  );
  return <SharedContext.Provider value={value}>{children}</SharedContext.Provider>;
}

export function useShared() {
  const ctx = useContext(SharedContext);
  if (!ctx) throw new Error("useShared must be used within SharedProvider");
  return ctx;
}

/** Live decrypted items of one shared vault + CRUD helpers. */
export function useSharedItems(vault: SharedVault) {
  const { user } = useAuth();
  const [items, setItems] = useState<Credential[]>([]);
  const vaultId = vault.id;
  const key = vault.key;

  useEffect(() => {
    return onSnapshot(collection(getFirebase().db, "sharedVaults", vaultId, "items"), async (snap) => {
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as ItemDoc;
          try {
            const p = normalizePayload(await decryptJSON<Partial<Payload>>(key, data));
            return { ...p, id: d.id, createdAt: data.createdAt, updatedAt: data.updatedAt } as Credential;
          } catch {
            return null; // mid key-rotation or tampered
          }
        }),
      );
      setItems(rows.filter((r): r is Credential => r !== null).sort((a, b) => b.updatedAt - a.updatedAt));
    });
  }, [vaultId, key]);

  const add = useCallback(
    async (input: CredentialInput) => {
      const now = Date.now();
      const sealed = await encryptJSON(key, nextPayload(null, input, now));
      await addDoc(collection(getFirebase().db, "sharedVaults", vaultId, "items"), {
        ...sealed,
        createdAt: now,
        updatedAt: now,
        updatedBy: user?.uid ?? "",
        keyVersion: vault.keyVersion,
      } satisfies ItemDoc);
    },
    [key, vaultId, user?.uid, vault.keyVersion],
  );

  const update = useCallback(
    async (id: string, input: CredentialInput) => {
      const existing = items.find((i) => i.id === id);
      if (!existing) return;
      const now = Date.now();
      const sealed = await encryptJSON(key, nextPayload(existing, input, now));
      await setDoc(doc(getFirebase().db, "sharedVaults", vaultId, "items", id), {
        ...sealed,
        createdAt: existing.createdAt,
        updatedAt: now,
        updatedBy: user?.uid ?? "",
        keyVersion: vault.keyVersion,
      } satisfies ItemDoc);
    },
    [items, key, vaultId, user?.uid, vault.keyVersion],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteDoc(doc(getFirebase().db, "sharedVaults", vaultId, "items", id));
    },
    [vaultId],
  );

  return { items, add, update, remove };
}
