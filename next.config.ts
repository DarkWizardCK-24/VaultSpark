import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

/**
 * Content Security Policy.
 * `connect-src` is pinned to the exact Firebase / breach-check hosts, so injected script could not
 * send secrets to an arbitrary server. Limits: `'unsafe-inline'` scripts are required by Next's
 * hydration without a per-request nonce, and the Google sign-in popup needs apis.google.com, so this
 * is defence-in-depth, not a substitute for keeping the codebase and dependencies clean.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://firestore.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://content-firebaseappcheck.googleapis.com",
    "https://api.pwnedpasswords.com", // breach check (k-anonymity)
    "https://www.google.com/recaptcha/",
    ...(isDev ? ["ws://localhost:*", "http://127.0.0.1:8080", "http://127.0.0.1:9099", "http://localhost:*"] : []),
  ].join(" "),
  `frame-src ${authDomain ? `https://${authDomain}` : "https://*.firebaseapp.com"} https://accounts.google.com https://www.google.com/recaptcha/ https://recaptcha.google.com`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // allow passkeys (WebAuthn) for this origin only; deny sensors/ads APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), publickey-credentials-get=(self), publickey-credentials-create=(self), clipboard-write=(self)",
  },
  // same-origin-allow-popups keeps Google sign-in popups working while isolating us from other windows
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // the service worker must always be revalidated and may not be sniffed
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
