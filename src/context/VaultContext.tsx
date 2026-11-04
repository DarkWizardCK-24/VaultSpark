"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  decryptBackup,
  decryptJSON,
  deriveKek,
  encryptBackup,
  encryptJSON,
  exportPublicJwk,
  fingerprintOfJwk,
  generateDek,
  generateKeyPair,
  generateRecoveryKey,
  importPublicJwk,
  KDF_ITERATIONS,
  openPrivateKey,
  randomSalt,
  recoveryKek,
  sealPrivateKey,
  unwrapDek,
  wrapDek,
  type BackupFile,
  type Sealed,
} from "@/lib/crypto";
import { getFirebase } from "@/lib/firebase";
import { nextPayload, normalizePayload, toInput, type Payload } from "@/lib/items";
import { createPasskey, getPasskeyKek } from "@/lib/passkey";
import type { Credential, CredentialDoc, CredentialInput } from "@/lib/types";
import { useAuth } from "./AuthContext";

type Status = "loading" | "error" | "needs-setup" | "locked" | "unlocked";

interface PasskeyMeta {
  id: string;
  label: string;
  prfSalt: string;
  wrappedDek: Sealed;
  createdAt: number;
}

interface VaultMeta {
  v: 2;
  salt: string;
  iterations: number;
  wrappedDek: Sealed;
  recovery?: { wrappedDek: Sealed; createdAt: number };
  passkeys?: PasskeyMeta[];
  keypair?: { publicJwk: JsonWebKey; privateSealed: Sealed };
  createdAt: number;
}

export interface VaultKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface VaultState {
  status: Status;
  credentials: Credential[];
  syncing: boolean;
  hasRecovery: boolean;
  passkeys: { id: string; label: string; createdAt: number }[];
  hasPasskey: boolean;
  /** Human-comparable fingerprint of your sharing public key (empty until ready). */
  sharingFingerprint: string;

  setupVault: (master: string) => Promise<string>;
  unlock: (master: string) => Promise<boolean>;
  unlockWithRecovery: (recoveryKey: string, newMaster: string) => Promise<boolean>;
  unlockWithPasskey: () => Promise<boolean>;
  lock: () => void;

  changeMaster: (current: string, next: string) => Promise<boolean>;
  regenerateRecovery: () => Promise<string>;
  addPasskey: (label: string) => Promise<void>;
  removePasskey: (id: string) => Promise<void>;

  addCredential: (input: CredentialInput) => Promise<void>;
  updateCredential: (id: string, input: CredentialInput) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  importCredentials: (inputs: CredentialInput[]) => Promise<number>;
  exportBackup: (password: string) => Promise<string>;
  importBackup: (text: string, password: string) => Promise<number | null>;

  /** For shared vaults: the user's RSA key pair (generated on first unlock). */
  getKeys: () => VaultKeys | null;
}

const VaultContext = createContext<VaultState | null>(null);

/** Auto-lock after this much inactivity. */
const IDLE_LOCK_MS = 5 * 60 * 1000;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, emailVerified } = useAuth();
  const uid = user?.uid;

  const [status, setStatus] = useState<Status>("loading");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [sharingFingerprint, setSharingFingerprint] = useState("");

  // Secrets live only in refs (never in state, storage or Firestore).
  const dekRef = useRef<CryptoKey | null>(null);
  const keysRef = useRef<VaultKeys | null>(null);
  const metaRef = useRef<VaultMeta | null>(null);

  const metaDoc = useCallback(() => doc(getFirebase().db, "users", uid!, "meta", "vault"), [uid]);

  /**
   * Read-modify-write of the vault metadata inside a transaction, so a device holding stale data can never
   * silently undo another device's change (new recovery key, passkey, key pair…).
   */
  const updateMeta = useCallback(
    async (fn: (current: VaultMeta) => VaultMeta) => {
      const ref = metaDoc();
      const next = await runTransaction(getFirebase().db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("Vault metadata is missing.");
        const updated = fn(snap.data() as VaultMeta);
        tx.set(ref, JSON.parse(JSON.stringify(updated)));
        return updated;
      });
      metaRef.current = next;
      setMeta(next);
      return next;
    },
    [metaDoc],
  );

  /** Re-read metadata from the server (another device may have changed the password / recovery key). */
  const freshMeta = useCallback(async () => {
    try {
      const snap = await getDocFromServer(metaDoc());
      if (snap.exists()) {
        const m = snap.data() as VaultMeta;
        metaRef.current = m;
        setMeta(m);
        return m;
      }
    } catch {
      /* offline: keep what we have */
    }
    return metaRef.current;
  }, [metaDoc]);

  const lock = useCallback(() => {
    dekRef.current = null;
    keysRef.current = null;
    setUnlocked(false);
    setCredentials([]);
    setSharingFingerprint("");
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  const finishUnlock = useCallback((dek: CryptoKey) => {
    dekRef.current = dek;
    setUnlocked(true);
    setStatus("unlocked");
  }, []);

  // Load vault metadata whenever the signed-in user changes.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset all vault state when the signed-in user changes */
    dekRef.current = null;
    keysRef.current = null;
    metaRef.current = null;
    setMeta(null);
    setUnlocked(false);
    setCredentials([]);
    setSharingFingerprint("");
    if (!uid) {
      setStatus("loading");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    getDoc(doc(getFirebase().db, "users", uid, "meta", "vault"))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const m = snap.data() as VaultMeta;
          metaRef.current = m;
          setMeta(m);
          setStatus("locked");
        } else setStatus("needs-setup");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // load (or generate once, race-safely) the RSA key pair for shared vaults and publish the public half
  // to the directory (keyed by verified email) so others can invite you.
  useEffect(() => {
    if (!uid || !unlocked || !dekRef.current) return;
    const dek = dekRef.current;
    const email = (user?.email ?? "").toLowerCase();
    let cancelled = false;
    (async () => {
      try {
        let m = metaRef.current;
        if (!m) return;
        if (!m.keypair) {
          const kp = await generateKeyPair();
          const candidate = { publicJwk: await exportPublicJwk(kp.publicKey), privateSealed: await sealPrivateKey(kp.privateKey, dek) };
          // If another device created one meanwhile, keep theirs (never overwrite an existing key pair).
          m = await updateMeta((cur) => (cur.keypair ? cur : { ...cur, keypair: candidate }));
        }
        const pair = m.keypair!;
        const privateKey = await openPrivateKey(pair.privateSealed, dek);
        const publicKey = await importPublicJwk(pair.publicJwk);
        const fp = await fingerprintOfJwk(pair.publicJwk);
        if (cancelled) return;
        keysRef.current = { publicKey, privateKey };
        setSharingFingerprint(fp);
        if (emailVerified && email) {
          await setDoc(doc(getFirebase().db, "publicKeys", email), { uid, jwk: pair.publicJwk });
        }
      } catch {
        /* sharing simply stays unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, unlocked, user?.email, emailVerified, updateMeta]);

  // Live, decrypted subscription while unlocked.
  useEffect(() => {
    if (!uid || !unlocked || !dekRef.current) return;
    const key = dekRef.current;
    setSyncing(true);
    const unsub: Unsubscribe = onSnapshot(
      collection(getFirebase().db, "users", uid, "credentials"),
      async (snap) => {
        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as CredentialDoc;
            try {
              const p = normalizePayload(await decryptJSON<Partial<Payload>>(key, data));
              return { ...p, id: d.id, createdAt: data.createdAt, updatedAt: data.updatedAt } as Credential;
            } catch {
              return null; // tampered or wrong-key doc: skip rather than crash
            }
          }),
        );
        setCredentials(rows.filter((r): r is Credential => r !== null).sort((a, b) => b.updatedAt - a.updatedAt));
        setSyncing(false);
      },
      () => setSyncing(false),
    );
    return unsub;
  }, [uid, unlocked]);

  // Auto-lock on inactivity.
  useEffect(() => {
    if (!unlocked) return;
    let t = setTimeout(lock, IDLE_LOCK_MS);
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(lock, IDLE_LOCK_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked, lock]);

  const setupVault = useCallback(
    async (master: string) => {
      if (!uid) throw new Error("Not signed in");
      const dek = await generateDek();
      const salt = randomSalt();
      const recoveryKey = generateRecoveryKey();
      const created: VaultMeta = {
        v: 2,
        salt,
        iterations: KDF_ITERATIONS,
        wrappedDek: await wrapDek(dek, await deriveKek(master, salt, KDF_ITERATIONS)),
        recovery: { wrappedDek: await wrapDek(dek, (await recoveryKek(recoveryKey))!), createdAt: Date.now() },
        createdAt: Date.now(),
      };
      // Atomic create-if-absent: never overwrite an existing vault (would orphan every encrypted credential).
      const ref = metaDoc();
      await runTransaction(getFirebase().db, async (tx) => {
        if ((await tx.get(ref)).exists()) throw new Error("A vault already exists for this account. Reload and unlock it.");
        tx.set(ref, JSON.parse(JSON.stringify(created)));
      });
      metaRef.current = created;
      setMeta(created);
      finishUnlock(dek);
      return recoveryKey;
    },
    [uid, metaDoc, finishUnlock],
  );

  /** Try with the cached metadata first; on failure retry once with fresh server metadata (password changed elsewhere). */
  const tryUnwrap = useCallback(
    async (pick: (m: VaultMeta) => Promise<CryptoKey | null>) => {
      const m = metaRef.current;
      if (!m) return null;
      const first = await pick(m);
      if (first) return first;
      const fresh = await freshMeta();
      return fresh && fresh !== m ? pick(fresh) : null;
    },
    [freshMeta],
  );

  const unlock = useCallback(
    async (master: string) => {
      const dek = await tryUnwrap(async (m) => unwrapDek(m.wrappedDek, await deriveKek(master, m.salt, m.iterations)));
      if (!dek) return false;
      finishUnlock(dek);
      return true;
    },
    [tryUnwrap, finishUnlock],
  );

  const unlockWithRecovery = useCallback(
    async (recoveryKeyText: string, newMaster: string) => {
      const kek = await recoveryKek(recoveryKeyText);
      if (!kek) return false;
      const dek = await tryUnwrap(async (m) => (m.recovery ? unwrapDek(m.recovery.wrappedDek, kek) : null));
      if (!dek) return false;
      // Set the new master password; the same recovery key stays valid.
      const salt = randomSalt();
      const wrappedDek = await wrapDek(dek, await deriveKek(newMaster, salt, KDF_ITERATIONS));
      await updateMeta((cur) => ({ ...cur, salt, iterations: KDF_ITERATIONS, wrappedDek }));
      finishUnlock(dek);
      return true;
    },
    [tryUnwrap, updateMeta, finishUnlock],
  );

  const unlockWithPasskey = useCallback(async () => {
    const m = metaRef.current;
    if (!m?.passkeys?.length) return false;
    for (const p of m.passkeys) {
      try {
        const dek = await unwrapDek(p.wrappedDek, await getPasskeyKek(p.id, p.prfSalt));
        if (dek) {
          finishUnlock(dek);
          return true;
        }
      } catch {
        /* try next passkey / fall back to password */
      }
    }
    return false;
  }, [finishUnlock]);

  const changeMaster = useCallback(
    async (current: string, next: string) => {
      const dek = await tryUnwrap(async (m) => unwrapDek(m.wrappedDek, await deriveKek(current, m.salt, m.iterations)));
      if (!dek) return false;
      const salt = randomSalt();
      // only the data key is re-wrapped, items stay untouched
      const wrappedDek = await wrapDek(dek, await deriveKek(next, salt, KDF_ITERATIONS));
      await updateMeta((cur) => ({ ...cur, salt, iterations: KDF_ITERATIONS, wrappedDek }));
      return true;
    },
    [tryUnwrap, updateMeta],
  );

  const regenerateRecovery = useCallback(async () => {
    const dek = dekRef.current;
    if (!dek) throw new Error("Vault is locked");
    const key = generateRecoveryKey();
    const wrapped = await wrapDek(dek, (await recoveryKek(key))!);
    await updateMeta((cur) => ({ ...cur, recovery: { wrappedDek: wrapped, createdAt: Date.now() } }));
    return key;
  }, [updateMeta]);

  const addPasskey = useCallback(
    async (label: string) => {
      const dek = dekRef.current;
      if (!uid || !dek) throw new Error("Vault is locked");
      const { credentialId, prfSalt, kek } = await createPasskey(uid, label);
      const entry: PasskeyMeta = { id: credentialId, label, prfSalt, wrappedDek: await wrapDek(dek, kek), createdAt: Date.now() };
      await updateMeta((cur) => ({ ...cur, passkeys: [...(cur.passkeys ?? []), entry] }));
    },
    [uid, updateMeta],
  );

  const removePasskey = useCallback(
    async (id: string) => {
      await updateMeta((cur) => ({ ...cur, passkeys: (cur.passkeys ?? []).filter((p) => p.id !== id) }));
    },
    [updateMeta],
  );

  const seal = useCallback(async (payload: Payload) => {
    if (!dekRef.current) throw new Error("Vault is locked");
    return encryptJSON(dekRef.current, payload);
  }, []);

  const addCredential = useCallback(
    async (input: CredentialInput) => {
      if (!uid) return;
      const now = Date.now();
      const sealed = await seal(nextPayload(null, input, now));
      await addDoc(collection(getFirebase().db, "users", uid, "credentials"), { ...sealed, createdAt: now, updatedAt: now } satisfies CredentialDoc);
    },
    [uid, seal],
  );

  const updateCredential = useCallback(
    async (id: string, input: CredentialInput) => {
      if (!uid) return;
      const existing = credentials.find((c) => c.id === id);
      if (!existing) return;
      const now = Date.now();
      const sealed = await seal(nextPayload(existing, input, now));
      await setDoc(doc(getFirebase().db, "users", uid, "credentials", id), { ...sealed, createdAt: existing.createdAt, updatedAt: now } satisfies CredentialDoc);
    },
    [uid, seal, credentials],
  );

  const removeCredential = useCallback(
    async (id: string) => {
      if (!uid) return;
      await deleteDoc(doc(getFirebase().db, "users", uid, "credentials", id));
    },
    [uid],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const c = credentials.find((x) => x.id === id);
      if (c) await updateCredential(id, { ...toInput(c), favorite: !c.favorite });
    },
    [credentials, updateCredential],
  );

  const importCredentials = useCallback(
    async (inputs: CredentialInput[]) => {
      if (!uid) return 0;
      const { db } = getFirebase();
      let n = 0;
      for (let i = 0; i < inputs.length; i += 200) {
        const batch = writeBatch(db);
        for (const input of inputs.slice(i, i + 200)) {
          const now = Date.now();
          const sealed = await seal(nextPayload(null, input, now));
          batch.set(doc(collection(db, "users", uid, "credentials")), { ...sealed, createdAt: now, updatedAt: now } satisfies CredentialDoc);
          n++;
        }
        await batch.commit();
      }
      return n;
    },
    [uid, seal],
  );

  const exportBackup = useCallback(
    async (password: string) => {
      const items = credentials.map((c) => toInput(c));
      return JSON.stringify(await encryptBackup(password, { exportedAt: Date.now(), items }), null, 2);
    },
    [credentials],
  );

  const importBackup = useCallback(
    async (text: string, password: string) => {
      let file: BackupFile;
      try {
        file = JSON.parse(text) as BackupFile;
      } catch {
        return null;
      }
      const data = await decryptBackup<{ items: Partial<CredentialInput>[] }>(password, file);
      if (!data?.items) return null;
      return importCredentials(data.items.map((i) => toInput(normalizePayload(i) as Credential)));
    },
    [importCredentials],
  );

  const value = useMemo<VaultState>(
    () => ({
      status,
      credentials,
      syncing,
      hasRecovery: !!meta?.recovery,
      passkeys: (meta?.passkeys ?? []).map(({ id, label, createdAt }) => ({ id, label, createdAt })),
      hasPasskey: !!meta?.passkeys?.length,
      sharingFingerprint,
      setupVault,
      unlock,
      unlockWithRecovery,
      unlockWithPasskey,
      lock,
      changeMaster,
      regenerateRecovery,
      addPasskey,
      removePasskey,
      addCredential,
      updateCredential,
      removeCredential,
      toggleFavorite,
      importCredentials,
      exportBackup,
      importBackup,
      getKeys: () => keysRef.current,
    }),
    [status, credentials, syncing, meta, sharingFingerprint, setupVault, unlock, unlockWithRecovery, unlockWithPasskey, lock, changeMaster, regenerateRecovery, addPasskey, removePasskey, addCredential, updateCredential, removeCredential, toggleFavorite, importCredentials, exportBackup, importBackup],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
