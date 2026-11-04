/**
 * Have I Been Pwned "Pwned Passwords" check using k-anonymity.
 * Only the first 5 hex chars of the password's SHA-1 hash leave the device; the full
 * hash is compared locally against the ~800 returned suffixes.
 */

async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const cache = new Map<string, number>();

/** Number of times the password appears in known breaches (0 = not found). Throws on network failure. */
export async function breachCount(password: string): Promise<number> {
  if (!password) return 0;
  const hash = await sha1Hex(password);
  if (cache.has(hash)) return cache.get(hash)!;
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" } });
  if (!res.ok) throw new Error("Breach service unavailable");
  const text = await res.text();
  let count = 0;
  for (const line of text.split("\n")) {
    const [s, c] = line.trim().split(":");
    if (s === suffix) {
      count = Number(c) || 0;
      break;
    }
  }
  cache.set(hash, count);
  return count;
}
