import { safeHttpUrl } from "./url";
import { EMPTY_CARD, EMPTY_INPUT, type CredentialInput } from "./types";

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF, embedded newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

const SYNONYMS = {
  title: ["title", "name"],
  url: ["url", "login_uri", "website", "login url"],
  username: ["username", "login_username", "login", "user"],
  password: ["password", "login_password", "pass"],
  notes: ["notes", "note", "extra"],
  totp: ["otpauth", "login_totp", "totp", "otp"],
  type: ["type"],
  favorite: ["favorite", "favourite"],
} as const;

export type CsvSource = "Chrome / Edge" | "Bitwarden" | "1Password" | "Generic CSV";

export interface CsvImportResult {
  source: CsvSource;
  items: CredentialInput[];
  skipped: number;
}

/** Detects Chrome, Bitwarden and 1Password exports (and anything with similar headers). */
export function importFromCsv(text: string): CsvImportResult | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof SYNONYMS) => headers.findIndex((h) => (SYNONYMS[key] as readonly string[]).includes(h));
  const idx = Object.fromEntries((Object.keys(SYNONYMS) as (keyof typeof SYNONYMS)[]).map((k) => [k, col(k)])) as Record<
    keyof typeof SYNONYMS,
    number
  >;
  if (idx.password < 0 && idx.notes < 0) return null;

  const source: CsvSource = headers.includes("login_uri")
    ? "Bitwarden"
    : headers.includes("otpauth") || headers.includes("archived")
      ? "1Password"
      : headers.join() === "name,url,username,password,note" || headers.join() === "name,url,username,password"
        ? "Chrome / Edge"
        : "Generic CSV";

  const get = (r: string[], k: keyof typeof SYNONYMS) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
  const items: CredentialInput[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const type = get(r, "type").toLowerCase();
    const password = get(r, "password");
    const notes = get(r, "notes");
    const title = get(r, "title") || get(r, "url").replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    if (type === "note" || type === "securenote" || type === "secure note") {
      if (!title && !notes) { skipped++; continue; }
      items.push({ ...EMPTY_INPUT, type: "note", title: title || "Imported note", notes });
      continue;
    }
    if (type && !["login", "password"].includes(type)) { skipped++; continue; } // cards/identities not mapped
    if (!title || (!password && !get(r, "username"))) { skipped++; continue; }
    items.push({
      ...EMPTY_INPUT,
      type: "login",
      title,
      username: get(r, "username"),
      password,
      url: safeHttpUrl(get(r, "url")),
      notes,
      totpSecret: get(r, "totp"),
      favorite: ["1", "true", "yes"].includes(get(r, "favorite").toLowerCase()),
      card: EMPTY_CARD,
    });
  }
  return { source, items, skipped };
}
