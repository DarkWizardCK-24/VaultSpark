"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfigBanner } from "@/components/ui/ConfigBanner";
import { MasterGate } from "@/components/vault/MasterGate";
import { RecoveryKeyModal } from "@/components/vault/RecoveryKeyModal";
import { VaultDashboard } from "@/components/vault/VaultDashboard";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";

function Spinner() {
  return (
    <div className="grid min-h-dvh flex-1 place-items-center">
      <Loader2 className="size-8 animate-spin text-lime-300" aria-label="Loading" />
    </div>
  );
}

export default function VaultPage() {
  const { user, loading, configured } = useAuth();
  const { status } = useVault();
  const router = useRouter();
  // Held here (not in MasterGate) because the gate unmounts the instant the vault unlocks.
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/login");
  }, [configured, loading, user, router]);

  if (!configured) return <div className="grid flex-1 place-items-center p-5"><ConfigBanner /></div>;
  if (loading || !user || status === "loading") return <Spinner />;
  if (status === "error")
    return (
      <div className="grid min-h-dvh flex-1 place-items-center p-6 text-center">
        <div className="glass max-w-sm space-y-4 rounded-3xl p-8">
          <h1 className="text-xl font-bold">Couldn’t reach your vault</h1>
          <p className="text-sm text-white/55">Check your connection and try again. Your data is safe.</p>
          <button className="btn btn-primary w-full" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  if (status === "needs-setup") return <MasterGate mode="setup" onRecoveryKey={setRecoveryKey} />;
  if (status === "locked") return <MasterGate mode="unlock" />;
  return (
    <>
      <VaultDashboard />
      {recoveryKey && <RecoveryKeyModal recoveryKey={recoveryKey} onDone={() => setRecoveryKey(null)} />}
    </>
  );
}
