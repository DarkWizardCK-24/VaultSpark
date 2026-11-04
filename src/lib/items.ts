import { safeHttpUrl } from "./url";
import { EMPTY_CARD, type Credential, type CredentialInput } from "./types";

/** The part of a Credential that gets encrypted. */
export type Payload = Omit<Credential, "id" | "createdAt" | "updatedAt">;

const HISTORY_LIMIT = 10;

/** Fill in fields missing from older/foreign payloads so the UI can rely on them. */
export function normalizePayload(p: Partial<Payload>): Payload {
  return {
    type: "login",
    title: "",
    username: "",
    password: "",
    category: "Other",
    notes: "",
    favorite: false,
    totpSecret: "",
    card: EMPTY_CARD,
    history: [],
    passwordChangedAt: Date.now(),
    ...p,
    url: safeHttpUrl(p.url ?? ""),
  };
}

/** Build the next encrypted payload; records the old password in history when it changes. */
export function nextPayload(existing: Credential | null, input: CredentialInput, now = Date.now()): Payload {
  if (!existing) return { ...input, history: [], passwordChangedAt: now };
  const changed = existing.password !== input.password;
  const history =
    changed && existing.password
      ? [{ password: existing.password, changedAt: existing.passwordChangedAt }, ...existing.history].slice(0, HISTORY_LIMIT)
      : existing.history;
  return { ...input, history, passwordChangedAt: changed ? now : existing.passwordChangedAt };
}

export function toInput(c: Credential): CredentialInput {
  return {
    type: c.type,
    title: c.title,
    username: c.username,
    password: c.password,
    url: c.url,
    category: c.category,
    notes: c.notes,
    favorite: c.favorite,
    totpSecret: c.totpSecret,
    card: c.card,
  };
}
