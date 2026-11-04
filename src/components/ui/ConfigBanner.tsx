import { TriangleAlert } from "lucide-react";

export function ConfigBanner() {
  return (
    <div className="glass mx-auto max-w-xl rounded-2xl border-amber-400/30 p-5 text-sm text-amber-100">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-4" /> Firebase isn’t configured yet
      </div>
      Copy <code className="rounded bg-black/40 px-1.5 py-0.5">.env.example</code> to{" "}
      <code className="rounded bg-black/40 px-1.5 py-0.5">.env.local</code>, paste your Firebase web-app keys, then
      restart <code className="rounded bg-black/40 px-1.5 py-0.5">npm run dev</code>. See the README for the 5-minute setup.
    </div>
  );
}
