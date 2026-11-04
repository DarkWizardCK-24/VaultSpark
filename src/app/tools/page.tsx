import type { Metadata } from "next";
import { PasswordChecker } from "@/components/PasswordChecker";
import { PasswordGenerator } from "@/components/PasswordGenerator";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = { title: "Free password tools" };

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <h1 className="text-4xl font-bold tracking-tight">Free password tools</h1>
        <p className="mt-2 max-w-xl text-white/55">No account needed. Everything runs in your browser.</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Strength checker</h2>
            <PasswordChecker />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Password generator</h2>
            <PasswordGenerator />
          </section>
        </div>
      </main>
    </>
  );
}
