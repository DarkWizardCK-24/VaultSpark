/** Only http(s) links are ever rendered/stored. Blocks javascript:, data:, vbscript: etc. Returns "" if unsafe. */
export function safeHttpUrl(input: string): string {
  const t = (input ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}
