/**
 * Passkey unlock via the WebAuthn PRF extension.
 *
 * The authenticator derives a stable secret from the passkey and a salt we store.
 * That secret becomes a key that wraps the vault's data key.
 */
import { kekFromPrf, randomBytes, toB64, fromB64 } from "./crypto";

type PrfResult = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

export const passkeySupported = () =>
  typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;

const withPrf = (salt: Uint8Array<ArrayBuffer>) =>
  ({ prf: { eval: { first: salt } } }) as unknown as AuthenticationExtensionsClientInputs;

async function assertWithPrf(credentialId: string, prfSalt: string): Promise<CryptoKey> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: fromB64(credentialId) }],
      userVerification: "required",
      timeout: 60_000,
      extensions: withPrf(fromB64(prfSalt)),
    },
  })) as PublicKeyCredential | null;
  const first = (cred?.getClientExtensionResults() as PrfResult | undefined)?.prf?.results?.first;
  if (!first) throw new Error("This device or browser doesn’t support passkey unlock (PRF extension).");
  return kekFromPrf(first);
}

export async function getPasskeyKek(credentialId: string, prfSalt: string) {
  return assertWithPrf(credentialId, prfSalt);
}

/** Registers a passkey and returns the KEK it derives. Throws if PRF is unsupported. */
export async function createPasskey(uid: string, label: string) {
  const prfSalt = toB64(randomBytes(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "VaultSpark", id: location.hostname },
      user: { id: new TextEncoder().encode(uid), name: label, displayName: label },
      challenge: randomBytes(32),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      timeout: 60_000,
      extensions: withPrf(fromB64(prfSalt)),
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey creation was cancelled.");
  const credentialId = toB64(cred.rawId);
  const ext = cred.getClientExtensionResults() as PrfResult;
  if (ext.prf?.results?.first) return { credentialId, prfSalt, kek: await kekFromPrf(ext.prf.results.first) };
  if (!ext.prf?.enabled) throw new Error("This device or browser doesn’t support passkey unlock (PRF extension).");
  // Some authenticators only return PRF output on a follow-up assertion.
  return { credentialId, prfSalt, kek: await assertWithPrf(credentialId, prfSalt) };
}
