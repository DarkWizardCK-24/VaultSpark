/**
 * Password strength analysis (entropy minus penalties for common passwords,
 * sequences and repeats).
 */

export type StrengthLevel =
  | "Very Weak"
  | "Weak"
  | "Reasonable"
  | "Strong"
  | "Very Strong"
  | "Extremely Strong";

export interface Conditions {
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  special: boolean;
  extended: boolean;
}

export interface StrengthResult {
  entropy: number; // bits, after penalties
  rawEntropy: number;
  level: StrengthLevel;
  score: number; // 0-4
  color: string;
  crackTime: string;
  conditions: Conditions;
  warnings: string[];
}

const SPECIAL = /[!@#$%^&*(),.?":{}|<>[\]\-_=`~;'\\/+]/;
const EXTENDED = /[^\u0000-\u007f]/;

const COMMON = new Set([
  "password", "123456", "12345678", "123456789", "qwerty", "abc123", "letmein",
  "welcome", "monkey", "dragon", "iloveyou", "admin", "login", "football",
  "baseball", "master", "sunshine", "princess", "passw0rd", "p@ssw0rd",
  "qwerty123", "1q2w3e4r", "111111", "000000", "trustno1", "superman",
]);

const SECONDS = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  year: 31536000,
  decade: 315360000,
  century: 3153600000,
};

export function checkConditions(pw: string): Conditions {
  return {
    lowercase: /[a-z]/.test(pw),
    uppercase: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: SPECIAL.test(pw),
    extended: EXTENDED.test(pw),
  };
}

export function rawEntropy(pw: string): number {
  if (!pw) return 0;
  const chars = Array.from(pw);
  const c = checkConditions(pw);
  let pool = 0;
  if (c.lowercase) pool += 26;
  if (c.uppercase) pool += 26;
  if (c.digit) pool += 10;
  if (c.special) pool += 33;
  if (c.extended) pool += 64;
  const unique = new Set(chars).size;
  const repetition = unique / chars.length;
  if (repetition < 1) pool = Math.max(2, Math.round(pool * repetition));
  return pool > 0 ? chars.length * Math.log2(pool) : 0;
}

function hasSequence(pw: string): boolean {
  const s = pw.toLowerCase();
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d === 1 || d === -1) {
      run++;
      if (run >= 4) return true;
    } else run = 1;
  }
  return false;
}

export function formatCrackTime(entropy: number, guessesPerSecond = 1e10): string {
  const seconds = Math.pow(2, entropy) / guessesPerSecond;
  if (!isFinite(seconds) || seconds > 1e30) return "longer than the universe";
  if (seconds < 1) return "instantly";
  if (seconds < SECONDS.minute) return `${seconds.toFixed(0)} seconds`;
  if (seconds < SECONDS.hour) return `${(seconds / SECONDS.minute).toFixed(0)} minutes`;
  if (seconds < SECONDS.day) return `${(seconds / SECONDS.hour).toFixed(0)} hours`;
  if (seconds < SECONDS.week) return `${(seconds / SECONDS.day).toFixed(0)} days`;
  if (seconds < SECONDS.year) return `${(seconds / SECONDS.week).toFixed(0)} weeks`;
  if (seconds < SECONDS.decade) return `~${(seconds / SECONDS.year).toFixed(0)} years`;
  if (seconds < SECONDS.century) return `~${(seconds / SECONDS.decade).toFixed(0)} decades`;
  const c = seconds / SECONDS.century;
  if (c < 1e6) return `~${Math.round(c).toLocaleString()} centuries`;
  return `~${c.toExponential(1)} centuries`;
}

const LEVELS: { max: number; level: StrengthLevel; score: number; color: string }[] = [
  { max: 28, level: "Very Weak", score: 0, color: "#f43f5e" },
  { max: 36, level: "Weak", score: 1, color: "#fb923c" },
  { max: 60, level: "Reasonable", score: 2, color: "#facc15" },
  { max: 80, level: "Strong", score: 3, color: "#4ade80" },
  { max: 100, level: "Very Strong", score: 4, color: "#2dd4bf" },
  { max: Infinity, level: "Extremely Strong", score: 4, color: "#bef264" },
];

export function analyzePassword(pw: string): StrengthResult {
  const warnings: string[] = [];
  const raw = rawEntropy(pw);
  let entropy = raw;

  if (pw) {
    if (COMMON.has(pw.toLowerCase())) {
      warnings.push("This is one of the most commonly used passwords.");
      entropy = Math.min(entropy, 10);
    }
    if (hasSequence(pw)) {
      warnings.push("Contains a sequence like “abcd” or “1234”.");
      entropy *= 0.8;
    }
    if (/(.)\1{2,}/.test(pw)) {
      warnings.push("Contains repeated characters (e.g. “aaa”).");
      entropy *= 0.85;
    }
    if (pw.length < 8) warnings.push("Use at least 12 characters.");
    else if (pw.length < 12) warnings.push("Longer is stronger, aim for 12+ characters.");
  }

  const tier = LEVELS.find((l) => entropy < l.max)!;
  return {
    entropy,
    rawEntropy: raw,
    level: tier.level,
    score: pw ? tier.score : 0,
    color: tier.color,
    crackTime: pw ? formatCrackTime(entropy) : "-",
    conditions: checkConditions(pw),
    warnings,
  };
}

/** Master password policy. Returns an error message or null. */
export function masterPasswordIssue(pw: string, email = ""): string | null {
  if (pw.length < 12) return "Master password must be at least 12 characters.";
  const r = analyzePassword(pw);
  if (COMMON.has(pw.toLowerCase())) return "That’s a commonly used password.";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) return "Don’t include your email name in the master password.";
  if (r.score < 3) return "Too guessable. Try a longer passphrase of 4+ random words (aim for “Strong”).";
  return null;
}

/** Account (sign-in) password. Firebase itself only enforces 6 chars, so we enforce more in the app. */
export function accountPasswordIssue(pw: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters.";
  if (COMMON.has(pw.toLowerCase())) return "That’s a commonly used password.";
  if (analyzePassword(pw).score < 2) return "Too weak. Add more length or variety.";
  return null;
}
