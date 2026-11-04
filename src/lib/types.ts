export const CATEGORIES = [
  "Social",
  "Work",
  "Finance",
  "Shopping",
  "Developer",
  "Entertainment",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type ItemType = "login" | "note" | "card";

export interface CardData {
  holder: string;
  number: string;
  expiry: string; // MM/YY
  cvv: string;
}

export interface PasswordHistoryEntry {
  password: string;
  changedAt: number;
}

/** Decrypted item, only ever in memory. */
export interface Credential {
  id: string;
  type: ItemType;
  title: string;
  username: string;
  password: string;
  url: string;
  category: Category;
  notes: string;
  favorite: boolean;
  totpSecret: string;
  card: CardData;
  history: PasswordHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  passwordChangedAt: number;
}

export type CredentialInput = Omit<
  Credential,
  "id" | "createdAt" | "updatedAt" | "passwordChangedAt" | "history"
>;

/** What actually lives in Firestore: opaque ciphertext + timestamps. */
export interface CredentialDoc {
  iv: string;
  ct: string;
  createdAt: number;
  updatedAt: number;
}

export const EMPTY_CARD: CardData = { holder: "", number: "", expiry: "", cvv: "" };

export const EMPTY_INPUT: CredentialInput = {
  type: "login",
  title: "",
  username: "",
  password: "",
  url: "",
  category: "Other",
  notes: "",
  favorite: false,
  totpSecret: "",
  card: EMPTY_CARD,
};
