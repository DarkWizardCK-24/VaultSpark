"use client";

import { motion } from "framer-motion";
import { CreditCard, ExternalLink, Eye, EyeOff, Pencil, Star, StickyNote, Trash2, User } from "lucide-react";
import { useState } from "react";
import { findPlatform } from "@/lib/platforms";
import type { Credential } from "@/lib/types";
import { CopyButton } from "../ui/CopyButton";
import { TotpCode } from "../ui/TotpCode";

const HUES = [160, 190, 30, 330, 80, 210, 100];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const maskCard = (n: string) => {
  const d = n.replace(/\D/g, "");
  return d ? `•••• •••• •••• ${d.slice(-4)}` : "-";
};

export function CredentialCard({ cred, onEdit, onDelete, onFavorite }: { cred: Credential; onEdit: () => void; onDelete: () => void; onFavorite: () => void }) {
  const [reveal, setReveal] = useState(false);
  const host = hostOf(cred.url);
  const platform = cred.type === "login" ? findPlatform(cred.title, cred.url) : undefined;
  const hue = HUES[(cred.title.charCodeAt(0) || 0) % HUES.length];
  const Glyph = cred.type === "card" ? CreditCard : cred.type === "note" ? StickyNote : null;

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="glass group rounded-2xl p-4 transition-colors hover:border-white/20 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold"
          style={platform ? { background: platform.color, color: platform.text ?? "#fff" } : { background: `hsl(${hue} 70% 50% / 0.18)`, color: `hsl(${hue} 85% 70%)` }}
        >
          {Glyph ? <Glyph className="size-5" /> : (cred.title[0] || "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{cred.title}</h3>
          {host ? (
            <a href={cred.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-white/45 hover:text-lime-300">
              {host} <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-white/35">{cred.type === "login" ? cred.category : cred.type === "card" ? "Payment card" : "Secure note"}</span>
          )}
        </div>
        <button onClick={onFavorite} aria-label={cred.favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={cred.favorite} className="grid size-9 place-items-center rounded-full hover:bg-white/10 active:scale-90">
          <Star className={`size-[18px] ${cred.favorite ? "fill-amber-300 text-amber-300" : "text-white/35"}`} />
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {cred.type === "login" && (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2">
              <User className="size-4 shrink-0 text-white/35" />
              <span className="min-w-0 flex-1 truncate">{cred.username}</span>
              <CopyButton text={cred.username} label="Username copied" title="Copy username" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono tracking-wide">{reveal ? cred.password : "•".repeat(Math.min(cred.password.length || 8, 14))}</span>
              <button onClick={() => setReveal((r) => !r)} aria-label={reveal ? "Hide password" : "Reveal password"} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">{reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              <CopyButton text={cred.password} secret label="Password copied" title="Copy password" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" />
            </div>
            {cred.totpSecret && <TotpCode secret={cred.totpSecret} />}
          </>
        )}

        {cred.type === "card" && (
          <>
            <div className="rounded-xl bg-gradient-to-br from-teal-400/20 via-lime-300/10 to-amber-300/20 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base tracking-widest">{reveal ? cred.card.number || "-" : maskCard(cred.card.number)}</span>
                <button onClick={() => setReveal((r) => !r)} aria-label={reveal ? "Hide card" : "Reveal card"} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10">{reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
              <div className="mt-3 flex items-end justify-between text-xs text-white/65">
                <span className="truncate uppercase">{cred.card.holder || "Cardholder"}</span>
                <span className="font-mono">{cred.card.expiry || "MM/YY"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <CopyButton text={cred.card.number.replace(/\s/g, "")} secret label="Card number copied" title="Copy number" className="btn btn-ghost flex-1 !py-2 !text-xs">Number</CopyButton>
              <CopyButton text={cred.card.cvv} secret label="CVV copied" title="Copy CVV" className="btn btn-ghost flex-1 !py-2 !text-xs">CVV</CopyButton>
            </div>
          </>
        )}

        {cred.type === "note" && <p className="line-clamp-4 whitespace-pre-wrap rounded-xl bg-black/25 px-3 py-2.5 text-white/70">{cred.notes}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50">{cred.category}</span>
        <div className="flex gap-1.5">
          <button onClick={onEdit} aria-label="Edit" className="btn btn-ghost !gap-1.5 !px-3 !py-1.5 !text-xs"><Pencil className="size-3.5" /> Edit</button>
          <button onClick={onDelete} aria-label="Delete" className="btn btn-danger !px-2.5 !py-1.5"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/30">Updated {new Date(cred.updatedAt).toLocaleDateString()}</p>
    </motion.article>
  );
}
