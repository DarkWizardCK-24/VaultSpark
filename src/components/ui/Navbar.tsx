"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Logo";

export function Navbar() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#05080d]/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-2 text-sm">
          <Link href="/tools" className="btn btn-ghost !py-2 hidden sm:inline-flex">
            Free tools
          </Link>
          {!loading && user ? (
            <Link href="/vault" className="btn btn-primary !py-2">
              Open vault
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !py-2">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary !py-2">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
