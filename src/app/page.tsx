import { Activity, Cloud, KeyRound, LockKeyhole, ScanSearch, Timer } from "lucide-react";
import Link from "next/link";
import { PasswordChecker } from "@/components/PasswordChecker";
import { Navbar } from "@/components/ui/Navbar";

const FEATURES = [
  { icon: LockKeyhole, title: "Zero-knowledge encryption", body: "Everything is sealed with AES-256-GCM in your browser. Your master password never leaves your device, so we can’t read your vault." },
  { icon: ScanSearch, title: "Live strength analysis", body: "Entropy, crack-time estimates, pattern and common-password detection as you type." },
  { icon: KeyRound, title: "Cryptographic generator", body: "Unbiased passwords from crypto.getRandomValues with every character class guaranteed." },
  { icon: Activity, title: "Security audit", body: "A vault health score that flags weak, reused and stale passwords so you know what to fix." },
  { icon: Cloud, title: "Synced everywhere", body: "Real-time sync across your devices through Firebase, with email or Google sign-in." },
  { icon: Timer, title: "Auto-lock & clipboard wipe", body: "The vault locks after 5 idle minutes and copied secrets are cleared from your clipboard after 30 seconds." },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-200">
              <span className="size-1.5 animate-pulse rounded-full bg-lime-300" /> End-to-end encrypted
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Passwords you can <span className="text-gradient">actually trust</span>.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/60">
              Check how strong your passwords are, generate new ones and store every credential in a zero-knowledge
              vault.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto !px-6 !py-3.5 text-base">Create your vault (free)</Link>
              <Link href="/tools" className="btn btn-ghost w-full sm:w-auto !px-6 !py-3.5 text-base">Try the free tools</Link>
            </div>
          </div>
          <div className="animate-float"><PasswordChecker /></div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Everything in one vault</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/55">
            The strength analyser from SecureSpark and the credential manager from PassVault, in one app.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
                <span className="grid size-11 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        © VaultSpark · Built with Next.js, Tailwind CSS &amp; Firebase
      </footer>
    </>
  );
}
