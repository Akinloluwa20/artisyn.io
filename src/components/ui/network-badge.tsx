"use client";

import { useStellarConfig } from "@/context/WalletProvider";
import {
  STELLAR_NETWORK_LABELS,
  type StellarNetworkName,
} from "@/lib/stellar-config";
import { cn } from "@/lib/utils";

/**
 * Non-production only network visibility (issue #204). Production must not
 * expose infrastructure configuration to end users.
 */
function isNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

const NETWORK_STYLES: Record<StellarNetworkName, string> = {
  testnet: "border-amber-300 bg-amber-50 text-amber-800",
  mainnet: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

/** Compact "which network am I on" chip for non-production environments. */
export function StellarNetworkBadge({ className }: { className?: string }) {
  // Hooks run before the early return so the rules of hooks hold.
  const { network } = useStellarConfig();

  if (!isNonProduction()) return null;

  return (
    <span
      data-testid="stellar-network-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        NETWORK_STYLES[network] ?? "border-slate-300 bg-slate-50 text-slate-700",
        className,
      )}
      title="Stellar network used for both balance reads and transaction signing"
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STELLAR_NETWORK_LABELS[network]}
    </span>
  );
}

/**
 * Pre-confirmation notice making the target network unambiguous outside
 * production. Rendered directly above the confirm action of a payment flow.
 */
export function StellarNetworkNotice({ className }: { className?: string }) {
  // Hooks run before the early return so the rules of hooks hold.
  const { network } = useStellarConfig();

  if (!isNonProduction()) return null;

  const label = STELLAR_NETWORK_LABELS[network];

  return (
    <p
      data-testid="stellar-network-notice"
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        NETWORK_STYLES[network] ?? "border-slate-300 bg-slate-50 text-slate-700",
        className,
      )}
      role="note"
    >
      You are signing and submitting on{" "}
      <span className="font-semibold">{label}</span>. Confirm your wallet is set
      to {label} before sending.
    </p>
  );
}
