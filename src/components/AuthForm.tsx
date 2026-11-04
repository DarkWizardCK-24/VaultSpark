"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Fingerprint, KeyRound, Loader2, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authErrorMessage, useAuth } from "@/context/AuthContext";
import { accountPasswordIssue, analyzePassword } from "@/lib/strength";
import { ConfigBanner } from "./ui/ConfigBanner";
import { Logo } from "./ui/Logo";
import { PasswordField } from "./ui/PasswordField";
import { StrengthBar } from "./ui/StrengthMeter";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3A12 12 0 1 1 24 12a11.9 11.9 0 0 1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12a11.9 11.9 0 0 1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.300-.1-2.700-.4-3.900z" />
    </svg>
  );
}

const PERKS = [
  { icon: ShieldCheck, text: "AES-256 zero-knowledge encryption" },
  { icon: KeyRound, text: "Unbreakable password generator" },
  { icon: Fingerprint, text: "Live vault security audit" },
];

export function AuthForm({ mode: initial }: { mode: Mode }) {
  const { user, loading, configured, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const isLogin = mode === "login";
  const strength = useMemo(() => analyzePassword(password), [password]);

  useEffect(() => {
    if (!loading && user) router.replace("/vault");
  }, [user, loading, router]);

  function switchMode(m: Mode) {
    setMode(m);
    window.history.replaceState(null, "", m === "login" ? "/login" : "/signup");
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(authErrorMessage(e));
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[1.05fr_1fr]">
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-teal-400/20 blur-3xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -right-20 bottom-10 size-80 rounded-full bg-amber-400/15 blur-3xl" animate={{ x: [0, -30, 0], y: [0, -40, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />

      <section className="relative flex flex-col items-center px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))] text-center lg:items-start lg:justify-center lg:px-16 lg:text-left">
        <div className="hidden w-full lg:block"><Logo /></div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="relative lg:mt-14 lg:self-start"
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="VaultSpark" className="size-24 rounded-[24%] shadow-[0_20px_60px_-12px_rgb(163_230_53/0.55)] sm:size-28 lg:size-36" />
          </motion.div>
        </motion.div>
        <motion.h1
          key={mode + "-h"}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
        >
          {isLogin ? (
            <>Welcome back to <span className="text-gradient">VaultSpark</span></>
          ) : (
            <>Lock down your <span className="text-gradient">digital life</span></>
          )}
        </motion.h1>
        <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-white/60 lg:max-w-md lg:text-lg">
          {isLogin ? "Your encrypted vault is one tap away." : "One master password. Every credential encrypted before it ever leaves your device."}
        </p>
        <ul className="mt-8 hidden space-y-3 lg:block">
          {PERKS.map(({ icon: Icon, text }, i) => (
            <motion.li key={text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.1 }} className="flex items-center gap-3 text-white/75">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-300/20 to-lime-300/20 text-lime-200"><Icon className="size-4" /></span>
              {text}
            </motion.li>
          ))}
        </ul>
      </section>

      <section className="relative z-10 mt-auto flex flex-1 items-end lg:items-center lg:justify-center lg:px-10">
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 20, delay: 0.1 }}
          className="glass w-full rounded-t-[2rem] bg-[#0a110f]/80 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 lg:max-w-md lg:rounded-3xl lg:px-8 lg:py-9"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 lg:hidden" />
          {!configured && <div className="mb-4"><ConfigBanner /></div>}

          <div role="tablist" aria-label="Authentication mode" className="relative mb-6 grid grid-cols-2 rounded-2xl bg-black/40 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={`relative z-10 py-2.5 text-sm font-semibold transition-colors ${mode === m ? "text-[#04130d]" : "text-white/55"}`}>
                {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-teal-300 to-lime-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <motion.form
            key={shake}
            animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
            transition={{ duration: 0.4 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLogin) {
                const issue = accountPasswordIssue(password);
                if (issue) {
                  toast.error(issue);
                  setShake((x) => x + 1);
                  return;
                }
              }
              run(() => (isLogin ? signIn(email, password) : signUp(name.trim(), email, password)));
            }}
            className="space-y-4"
          >
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div key="name" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <label className="label" htmlFor="name">Full name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                    <input id="name" className="field !pl-10 !text-base" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ada Lovelace" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                <input id="email" type="email" required inputMode="email" className="field !pl-10 !text-base" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Password</label>
                {isLogin && (
                  <button type="button" className="mb-1.5 text-xs font-medium text-lime-300 hover:underline" onClick={() => email ? run(async () => { await resetPassword(email); toast.success("Reset link sent, check your inbox."); }) : toast.error("Enter your email first.")}>
                    Forgot password?
                  </button>
                )}
              </div>
              <PasswordField id="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} />
              <AnimatePresence initial={false}>
                {!isLogin && password && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-2.5"><StrengthBar result={strength} /></div>
                    <p className="mt-1.5 text-xs" style={{ color: strength.color }}>{strength.level}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !configured} className="btn btn-primary w-full !py-3.5 !text-base">
              {busy ? <Loader2 className="size-5 animate-spin" /> : null}
              {isLogin ? "Sign in" : "Create account"}
              {!busy && <ArrowRight className="size-4" />}
            </motion.button>
          </motion.form>

          <div className="my-5 flex items-center gap-3 text-xs text-white/35">
            <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="button" disabled={busy || !configured} className="btn btn-ghost w-full !py-3.5" onClick={() => run(signInWithGoogle)}>
            <GoogleIcon /> Google
          </motion.button>

          <p className="mt-6 text-center text-xs text-white/40">
            <Link href="/tools" className="hover:text-white">Try the free password tools</Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
