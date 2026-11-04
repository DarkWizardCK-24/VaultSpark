import type { Category } from "./types";

export interface Platform {
  name: string;
  url: string;
  category: Category;
  color: string; // brand-ish tile colour
  text?: string; // tile text colour override
}

/** One-tap presets for the social accounts and sites people store most. */
export const PLATFORMS: Platform[] = [
  { name: "Instagram", url: "https://instagram.com", category: "Social", color: "#e1306c" },
  { name: "Facebook", url: "https://facebook.com", category: "Social", color: "#1877f2" },
  { name: "X (Twitter)", url: "https://x.com", category: "Social", color: "#e7e9ea", text: "#000" },
  { name: "LinkedIn", url: "https://linkedin.com", category: "Social", color: "#0a66c2" },
  { name: "WhatsApp", url: "https://web.whatsapp.com", category: "Social", color: "#25d366", text: "#06240f" },
  { name: "Snapchat", url: "https://snapchat.com", category: "Social", color: "#fffc00", text: "#000" },
  { name: "Reddit", url: "https://reddit.com", category: "Social", color: "#ff4500" },
  { name: "Discord", url: "https://discord.com", category: "Social", color: "#5865f2" },
  { name: "Telegram", url: "https://web.telegram.org", category: "Social", color: "#2aabee" },
  { name: "Pinterest", url: "https://pinterest.com", category: "Social", color: "#e60023" },
  { name: "YouTube", url: "https://youtube.com", category: "Entertainment", color: "#ff0033" },
  { name: "Netflix", url: "https://netflix.com", category: "Entertainment", color: "#e50914" },
  { name: "Spotify", url: "https://spotify.com", category: "Entertainment", color: "#1ed760", text: "#04130d" },
  { name: "GitHub", url: "https://github.com", category: "Developer", color: "#e6edf3", text: "#0d1117" },
  { name: "Bitbucket", url: "https://bitbucket.org", category: "Developer", color: "#2684ff" },
  { name: "Vercel", url: "https://vercel.com", category: "Developer", color: "#ffffff", text: "#000" },
  { name: "Google", url: "https://accounts.google.com", category: "Other", color: "#ffffff", text: "#202124" },
  { name: "Amazon", url: "https://amazon.com", category: "Shopping", color: "#ff9900", text: "#111" },
];

const byName = new Map(PLATFORMS.map((p) => [p.name.toLowerCase(), p]));

/** Match a credential title/url to a known platform (for brand-coloured tiles). */
export function findPlatform(title: string, url = ""): Platform | undefined {
  const t = title.trim().toLowerCase();
  const direct = byName.get(t);
  if (direct) return direct;
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  return PLATFORMS.find((p) => {
    const key = p.name.toLowerCase().split(" ")[0];
    return t.startsWith(key) || (host && host.includes(key));
  });
}
