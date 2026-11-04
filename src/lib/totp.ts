/** RFC 6238 time-based one-time passwords (what Google Authenticator / Authy generate). */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Uint8Array<ArrayBuffer> | null {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  if (!clean || [...clean].some((c) => !ALPHABET.includes(c))) return null;
  const out = new Uint8Array(new ArrayBuffer(Math.floor((clean.length * 5) / 8)));
  let bits = 0;
  let value = 0;
  let i = 0;
  for (const c of clean) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out[i++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return out;
}

export interface TotpConfig {
  secret: string; // base32
  digits: number;
  period: number;
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
}

/** Accepts a bare base32 secret or a full otpauth://totp/... URI. Returns null if invalid. */
export function parseTotp(input: string): TotpConfig | null {
  const raw = input.trim();
  if (!raw) return null;
  let secret = raw;
  let digits = 6;
  let period = 30;
  let algorithm: TotpConfig["algorithm"] = "SHA-1";
  if (/^otpauth:\/\//i.test(raw)) {
    try {
      const p = new URL(raw).searchParams;
      secret = p.get("secret") ?? "";
      digits = Number(p.get("digits") ?? 6) || 6;
      period = Number(p.get("period") ?? 30) || 30;
      const a = (p.get("algorithm") ?? "SHA1").toUpperCase().replace("SHA", "SHA-").replace("SHA--", "SHA-");
      if (a === "SHA-256" || a === "SHA-512") algorithm = a;
    } catch {
      return null;
    }
  }
  if (!base32Decode(secret)) return null;
  if (![6, 7, 8].includes(digits) || period < 5 || period > 120) return null;
  return { secret: secret.replace(/[\s=-]/g, "").toUpperCase(), digits, period, algorithm };
}

export async function generateTotp(cfg: TotpConfig, nowMs = Date.now()): Promise<{ code: string; remaining: number }> {
  const key = base32Decode(cfg.secret)!;
  const counter = Math.floor(nowMs / 1000 / cfg.period);
  const msg = new Uint8Array(new ArrayBuffer(8));
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
  const hmacKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: cfg.algorithm }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, msg));
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  const code = String(bin % 10 ** cfg.digits).padStart(cfg.digits, "0");
  return { code, remaining: cfg.period - (Math.floor(nowMs / 1000) % cfg.period) };
}
