/**
 * Vault crypto (WebCrypto only).
 *
 * A random AES-256-GCM data key (DEK) encrypts every item. The DEK is wrapped
 * separately by each unlock factor:
 *   master password -> PBKDF2-SHA256 (600k) -> KEK
 *   recovery key    -> 256-bit random value -> KEK
 *   passkey         -> WebAuthn PRF output -> HKDF -> KEK
 *
 * Changing the master password only re-wraps the DEK, items stay as they are.
 */

export const KDF_ITERATIONS = 600_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Sealed {
  iv: string;
  ct: string;
}

export const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};

export const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

export const randomBytes = (n: number): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(out);
  return out;
};

export const randomSalt = (bytes = 16) => toB64(randomBytes(bytes));

export async function encryptJSON(key: CryptoKey, data: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct));
  return JSON.parse(dec.decode(pt)) as T;
}

// extractable so another factor can re-wrap it
export const generateDek = () =>
  crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<Sealed> {
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv });
  return { iv: toB64(iv), ct: toB64(wrapped) };
}

/** Returns null when the KEK is wrong (AES-GCM authentication fails). */
export async function unwrapDek(sealed: Sealed, kek: CryptoKey): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      fromB64(sealed.ct),
      kek,
      { name: "AES-GCM", iv: fromB64(sealed.iv) },
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }
}

const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 5_000_000;

async function pbkdf2(password: string, saltB64: string, iterations: number, usages: KeyUsage[]) {
  // Metadata/backups are untrusted input: refuse absurd work factors (DoS) or weak ones (downgrade).
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) throw new Error("Unsupported key-derivation settings");
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

export const deriveKek = (password: string, saltB64: string, iterations = KDF_ITERATIONS) =>
  pbkdf2(password, saltB64, iterations, ["wrapKey", "unwrapKey"]);

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: no I, L, O, U

export function generateRecoveryKey(): string {
  const bytes = randomBytes(32);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out.match(/.{1,4}/g)!.join("-"); // 13 groups of 4
}

export async function recoveryKek(recoveryKey: string): Promise<CryptoKey | null> {
  const clean = recoveryKey
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (clean.length !== 52 || [...clean].some((c) => !B32.includes(c))) return null;
  const bytes = new Uint8Array(new ArrayBuffer(32));
  let bits = 0;
  let value = 0;
  let i = 0;
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8 && i < 32) {
      bytes[i++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["wrapKey", "unwrapKey"]);
}

export async function kekFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode("vaultspark-passkey-v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export interface BackupFile extends Sealed {
  app: "vaultspark";
  v: 1;
  salt: string;
  iterations: number;
}

export async function encryptBackup(password: string, data: unknown): Promise<BackupFile> {
  const salt = randomSalt();
  const key = await pbkdf2(password, salt, KDF_ITERATIONS, ["encrypt", "decrypt"]);
  return { app: "vaultspark", v: 1, salt, iterations: KDF_ITERATIONS, ...(await encryptJSON(key, data)) };
}

export async function decryptBackup<T>(password: string, file: BackupFile): Promise<T | null> {
  if (file?.app !== "vaultspark" || file.v !== 1) return null;
  try {
    const key = await pbkdf2(password, file.salt, file.iterations, ["encrypt", "decrypt"]);
    return await decryptJSON<T>(key, file);
  } catch {
    return null;
  }
}

const RSA = { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;

export const generateKeyPair = () => crypto.subtle.generateKey(RSA, true, ["wrapKey", "unwrapKey"]) as Promise<CryptoKeyPair>;

export const exportPublicJwk = (k: CryptoKey) => crypto.subtle.exportKey("jwk", k);
export const importPublicJwk = (jwk: JsonWebKey) =>
  crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["wrapKey"]);

export async function sealPrivateKey(priv: CryptoKey, dek: CryptoKey): Promise<Sealed> {
  return encryptJSON(dek, toB64(await crypto.subtle.exportKey("pkcs8", priv)));
}
export async function openPrivateKey(sealed: Sealed, dek: CryptoKey): Promise<CryptoKey> {
  const b64 = await decryptJSON<string>(dek, sealed);
  return crypto.subtle.importKey("pkcs8", fromB64(b64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["unwrapKey"]);
}

export async function wrapKeyFor(vaultKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  return toB64(await crypto.subtle.wrapKey("raw", vaultKey, publicKey, { name: "RSA-OAEP" }));
}
export const unwrapKeyWith = (b64: string, privateKey: CryptoKey) =>
  crypto.subtle.unwrapKey("raw", fromB64(b64), privateKey, { name: "RSA-OAEP" }, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);

/** Short fingerprint of a public key ("safety number") to compare out of band. */
export async function fingerprintOfJwk(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(canonical)));
  const hex = [...digest.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return hex.match(/.{1,4}/g)!.join("-");
}
