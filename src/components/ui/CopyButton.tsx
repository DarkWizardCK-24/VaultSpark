"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CLEAR_AFTER_MS = 30_000;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

// secrets are wiped from the clipboard after 30s if it still holds our value
export async function copySecret(text: string, label = "Copied", secret = false) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(secret ? `${label}, clipboard clears in 30s` : label);
    if (secret) {
      clearTimeout(clearTimer);
      clearTimer = setTimeout(async () => {
        try {
          if ((await navigator.clipboard.readText()) === text) await navigator.clipboard.writeText("");
        } catch {
          /* read permission denied, best effort */
        }
      }, CLEAR_AFTER_MS);
    }
    return true;
  } catch {
    toast.error("Couldn't access the clipboard");
    return false;
  }
}

export function CopyButton({
  text,
  label = "Copied",
  secret = false,
  className = "",
  title = "Copy",
  children,
}: {
  text: string;
  label?: string;
  secret?: boolean;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={!text}
      className={className || "btn btn-ghost !p-2"}
      onClick={async () => {
        if (await copySecret(text, label, secret)) {
          setDone(true);
          clearTimeout(t.current);
          t.current = setTimeout(() => setDone(false), 1500);
        }
      }}
    >
      {done ? <Check className="size-4 text-lime-300" /> : <Copy className="size-4" />}
      {children}
    </button>
  );
}
