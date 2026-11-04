"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, CreditCard, KeyRound, LayoutGrid, Lock, LogOut, Plus, Search, Settings, Star, StickyNote, Users, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";
import { CATEGORIES, type Credential } from "@/lib/types";
import { PasswordGenerator } from "../PasswordGenerator";
import { Logo } from "../ui/Logo";
import { CredentialCard } from "./CredentialCard";
import { CredentialModal } from "./CredentialModal";
import { SecurityAudit } from "./SecurityAudit";
import { SettingsPanel } from "./SettingsPanel";
import { SharedVaults } from "./SharedVaults";

type View = "all" | "favorites" | "cards" | "notes" | "audit" | "generator" | "shared" | "settings" | (typeof CATEGORIES)[number];

export function VaultDashboard() {
  const { user, logout } = useAuth();
  const { credentials, lock, removeCredential, toggleFavorite, syncing, addCredential, updateCredential } = useVault();
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Credential | "new" | null>(null);
  const firstName = (user?.displayName || user?.email || "there").split(/[ @]/)[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return credentials.filter((c) => {
      if (view === "favorites" && !c.favorite) return false;
      if (view === "cards" && c.type !== "card") return false;
      if (view === "notes" && c.type !== "note") return false;
      if ((CATEGORIES as readonly string[]).includes(view) && c.category !== view) return false;
      if (!q) return true;
      return [c.title, c.username, c.url, c.category].some((f) => f.toLowerCase().includes(q));
    });
  }, [credentials, view, query]);

  const nav: { id: View; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "all", label: "Vault", icon: LayoutGrid, count: credentials.length },
    { id: "favorites", label: "Favorites", icon: Star, count: credentials.filter((c) => c.favorite).length },
    { id: "shared", label: "Shared", icon: Users },
    { id: "audit", label: "Audit", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];
  const tools: { id: View; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "cards", label: "Cards", icon: CreditCard, count: credentials.filter((c) => c.type === "card").length },
    { id: "notes", label: "Secure notes", icon: StickyNote, count: credentials.filter((c) => c.type === "note").length },
    { id: "generator", label: "Generator", icon: Wand2 },
  ];
  const isList = !["audit", "generator", "shared", "settings"].includes(view);

  async function remove(c: Credential) {
    if (!window.confirm(`Delete “${c.title}”? This can’t be undone.`)) return;
    try {
      await removeCredential(c.id);
      toast.success("Credential deleted");
    } catch {
      toast.error("Couldn’t delete. Try again.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 lg:px-4 lg:py-5">
      {/* Desktop sidebar */}
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 lg:block">
        <div className="glass flex h-full flex-col gap-5 rounded-3xl p-4">
          <div className="px-2 pt-1"><Logo href="/vault" /></div>
          <nav className="flex flex-col gap-1" aria-label="Vault sections">
            {nav.map((n) => (
              <NavButton key={n.id} active={view === n.id} onClick={() => setView(n.id)} icon={n.icon} count={n.count}>{n.label}</NavButton>
            ))}
            {tools.map((n) => (
              <NavButton key={n.id} active={view === n.id} onClick={() => setView(n.id)} icon={n.icon} count={n.count}>{n.label}</NavButton>
            ))}
            <p className="label mt-3 px-3">Categories</p>
            {CATEGORIES.map((c) => (
              <NavButton key={c} active={view === c} onClick={() => setView(c)} icon={KeyRound} count={credentials.filter((x) => x.category === c).length}>{c}</NavButton>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <div className="truncate px-2 text-xs text-white/40">{user?.email}</div>
            <button onClick={lock} className="btn btn-ghost w-full"><Lock className="size-4" /> Lock now</button>
            <button onClick={logout} className="btn btn-ghost w-full"><LogOut className="size-4" /> Sign out</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-32 lg:pb-0">
        {/* Mobile app bar */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#070d0b]/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo href="/vault" withText={false} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/45">Welcome back</p>
              <p className="truncate text-lg font-bold leading-tight">Hi, {firstName} 👋</p>
            </div>
            <button onClick={lock} aria-label="Lock vault" className="grid size-10 place-items-center rounded-full bg-white/8 active:scale-95"><Lock className="size-[18px]" /></button>
            <button onClick={logout} aria-label="Sign out" className="grid size-10 place-items-center rounded-full bg-white/8 active:scale-95"><LogOut className="size-[18px]" /></button>
          </div>
          <div className={`mt-3 items-center gap-3 lg:mt-0 ${isList ? "flex" : "hidden"}`}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your vault…" className="field !rounded-full !pl-11 !text-base lg:!rounded-2xl" aria-label="Search vault" />
            </div>
            <button className="btn btn-primary hidden lg:inline-flex" onClick={() => setEditing("new")}><Plus className="size-4" /> Add item</button>
          </div>
          {/* Category chips (mobile) */}
          <div className={`-mx-4 mt-3 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden ${view === "shared" || view === "settings" || view === "audit" ? "hidden" : "flex"}`}>
            {[...["All", "Cards", "Notes", "Generate"], ...CATEGORIES].map((c) => {
              const id = (c === "All" ? "all" : c === "Generate" ? "generator" : c.toLowerCase() === "cards" || c === "Notes" ? c.toLowerCase() : c) as View;
              const active = view === id;
              return (
                <button key={c} onClick={() => setView(id)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active ? "border-transparent bg-gradient-to-r from-teal-300 to-lime-300 text-[#04130d]" : "border-white/10 bg-white/5 text-white/65"}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </header>

        <div className="space-y-5 px-4 pt-4 lg:px-0 lg:pt-5">
          {view === "audit" && <SecurityAudit credentials={credentials} onEdit={setEditing} />}
          {view === "generator" && <div className="mx-auto max-w-xl"><PasswordGenerator /></div>}
          {view === "shared" && <SharedVaults />}
          {view === "settings" && <SettingsPanel />}

          {isList &&
            (filtered.length === 0 ? (
              <div className="glass grid place-items-center rounded-3xl px-6 py-16 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-300/15 to-amber-300/15"><KeyRound className="size-8 text-lime-200/70" /></span>
                <h2 className="mt-5 text-lg font-semibold">{syncing ? "Decrypting your vault…" : credentials.length === 0 ? "Your vault is empty" : "Nothing matches"}</h2>
                <p className="mt-1 max-w-xs text-sm text-white/50">{credentials.length === 0 ? "Add your first credential. It’s encrypted before it leaves your device." : "Try a different search or category."}</p>
                {credentials.length === 0 && !syncing && <button className="btn btn-primary mt-6" onClick={() => setEditing("new")}><Plus className="size-4" /> Add credential</button>}
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((c) => (
                    <CredentialCard key={c.id} cred={c} onEdit={() => setEditing(c)} onDelete={() => remove(c)} onFavorite={() => toggleFavorite(c.id)} />
                  ))}
                </AnimatePresence>
              </div>
            ))}
        </div>
      </main>

      {/* Mobile FAB (personal items only) */}
      {isList && <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setEditing("new")}
        aria-label="Add credential"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 z-40 grid size-14 place-items-center rounded-full bg-gradient-to-br from-teal-300 via-lime-300 to-amber-300 text-[#04130d] shadow-[0_12px_30px_-6px_rgb(163_230_53/0.6)] lg:hidden"
      >
        <Plus className="size-7" strokeWidth={2.6} />
      </motion.button>}

      {/* Mobile bottom tab bar */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#070d0b]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {nav.map((n) => {
            const active = view === n.id || (n.id === "all" && isList && !["favorites"].includes(view));
            return (
              <li key={n.id}>
                <button onClick={() => setView(n.id)} aria-current={active ? "page" : undefined} className="relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium active:scale-95">
                  {active && <motion.span layoutId="tab-dot" className="absolute -top-px h-0.5 w-8 rounded-full bg-gradient-to-r from-teal-300 to-lime-300" />}
                  <n.icon className={`size-[22px] ${active ? "text-lime-300" : "text-white/45"}`} />
                  <span className={active ? "text-white" : "text-white/45"}>{n.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <CredentialModal editing={editing} onClose={() => setEditing(null)} onSave={(input, id) => (id ? updateCredential(id, input) : addCredential(input))} />
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, count, children }: { active: boolean; onClick: () => void; icon: React.ElementType; count?: number; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-lime-300/12 text-lime-200" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
      <Icon className="size-4" />
      <span className="flex-1 text-left">{children}</span>
      {count !== undefined && <span className="text-xs text-white/35">{count}</span>}
    </button>
  );
}
