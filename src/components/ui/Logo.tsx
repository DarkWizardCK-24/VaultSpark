import Link from "next/link";

export function Logo({ href = "/", size = 36, withText = true }: { href?: string; size?: number; withText?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="VaultSpark home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={size} height={size} className="rounded-[22%] shadow-[0_8px_24px_-10px_rgb(163_230_53/0.7)]" />
      {withText && (
        <span className="text-lg">
          Vault<span className="bg-gradient-to-r from-teal-300 to-lime-300 bg-clip-text text-transparent">Spark</span>
        </span>
      )}
    </Link>
  );
}
