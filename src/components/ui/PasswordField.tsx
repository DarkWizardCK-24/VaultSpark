"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

export function PasswordField({
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete = "off",
  autoFocus,
  id,
  icon = true,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  id?: string;
  icon?: boolean;
  right?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {icon && <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />}
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`field font-mono ${icon ? "!pl-10" : ""} ${right ? "!pr-24" : "!pr-11"}`}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {right}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid size-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
