"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Horizon, Networks } from "@stellar/stellar-sdk";
import { ISupportedWallet } from "@creit.tech/stellar-wallets-kit";
import { kit as getKitInstance } from "@/lib/stellar-wallets-kit";

const Server = Horizon.Server;

/** Per-wallet connection timeout (ms) before surfacing a recoverable timeout state. */
export const WALLET_CONNECT_TIMEOUT_MS = 30_000;

export type WalletConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "canceled"
  | "timeout";

export type WalletConnectionErrorCode =
  | "timeout"
  | "canceled"
  | "not_available"
  | "rejected"
  | "unknown";

export interface WalletConnectionError {
  code: WalletConnectionErrorCode;
  message: string;
  walletId?: string;
  walletName?: string;
}

export interface Balance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface PaymentOptions {
  to: string;
  amount: string;
  asset?: "XLM" | { code: string; issuer: string };
  memo?: string;
  secret?: string;
}

interface WalletContextState {
  connected: boolean;
  publicKey?: string;
  walletName?: string;
  balances: Balance[];
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  sendPayment?: (
    opts: PaymentOptions,
  ) => Promise<Horizon.HorizonApi.SubmitTransactionResponse>;
  /** Current connection attempt feedback for UI. */
  connectionStatus: WalletConnectionStatus;
  /** Last connection failure with a user-facing reason. */
  connectionError: WalletConnectionError | null;
  /** Wallet id from the last connect attempt (for retry without reload). */
  lastAttemptedWalletId?: string;
  /** Clear error/canceled/timeout feedback so the user can retry cleanly. */
  clearConnectionFeedback: () => void;
}

interface WalletConfigContextState {
  horizonUrl: string;
  network: string;
}

const WalletContext = createContext<WalletContextState | undefined>(undefined);
const WalletConfigContext = createContext<WalletConfigContextState | undefined>(
  undefined,
);

function classifyWalletError(
  error: unknown,
  walletId?: string,
  walletName?: string,
): WalletConnectionError {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    (error instanceof Error && error.name === "TimeoutError")
  ) {
    return {
      code: "timeout",
      message: `${walletName || walletId || "Wallet"} did not respond in time. Check that the extension is unlocked, then try again.`,
      walletId,
      walletName,
    };
  }

  if (
    lower.includes("cancel") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected by user") ||
    lower.includes("closed")
  ) {
    return {
      code: "canceled",
      message: `Connection to ${walletName || walletId || "wallet"} was canceled. You can try again when ready.`,
      walletId,
      walletName,
    };
  }

  if (
    lower.includes("not found") ||
    lower.includes("not installed") ||
    lower.includes("not available") ||
    lower.includes("no provider") ||
    lower.includes("extension")
  ) {
    return {
      code: "not_available",
      message: `${walletName || walletId || "Wallet"} does not appear to be available. Install or unlock the wallet extension, then retry.`,
      walletId,
      walletName,
    };
  }

  if (lower.includes("reject") || lower.includes("denied")) {
    return {
      code: "rejected",
      message: `${walletName || walletId || "Wallet"} rejected the connection request. Approve the request in your wallet, then retry.`,
      walletId,
      walletName,
    };
  }

  const detail =
    error instanceof Error && error.message
      ? error.message
      : "An unexpected error occurred while connecting.";

  return {
    code: "unknown",
    message: `Could not connect to ${walletName || walletId || "wallet"}: ${detail}`,
    walletId,
    walletName,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(
        `${label} timed out after ${Math.round(ms / 1000)}s`,
      );
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function WalletProvider({
  children,
  horizonUrl = "https://horizon-testnet.stellar.org",
  network = Networks.TESTNET,
}: {
  children: ReactNode;
  horizonUrl?: string;
  network?: string;
}) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>();
  const [walletName, setWalletName] = useState<string>();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<WalletConnectionStatus>("idle");
  const [connectionError, setConnectionError] =
    useState<WalletConnectionError | null>(null);
  const [lastAttemptedWalletId, setLastAttemptedWalletId] = useState<
    string | undefined
  >();
  const [server] = useState(() => new Server(horizonUrl));
  const connectGeneration = useRef(0);

  const clearConnectionFeedback = useCallback(() => {
    setConnectionError(null);
    setConnectionStatus((prev) =>
      prev === "connecting" || prev === "connected" ? prev : "idle",
    );
  }, []);

  const handleWalletSelection = useCallback(
    async (id: string, name: string) => {
      const kit = getKitInstance();
      kit.setWallet(id);
      const { address } = await withTimeout(
        kit.getAddress(),
        WALLET_CONNECT_TIMEOUT_MS,
        `${name || id} connection`,
      );

      setPublicKey(address);
      setWalletName(name);
      setConnected(true);
      setConnectionStatus("connected");
      setConnectionError(null);

      if (typeof window !== "undefined") {
        localStorage.setItem("stellar_wallet_connected", "true");
        localStorage.setItem("stellar_wallet_id", id);
        localStorage.setItem("stellar_wallet_address", address);
        localStorage.setItem("stellar_wallet_name", name);
      }

      try {
        const account = await server.accounts().accountId(address).call();
        setBalances(account.balances);
      } catch {
        setBalances([]);
      }
    },
    [server],
  );

  const connect = useCallback(
    async (walletId?: string) => {
      const generation = ++connectGeneration.current;
      setLastAttemptedWalletId(walletId);
      setConnectionStatus("connecting");
      setConnectionError(null);

      let resolvedName = walletId;

      try {
        const kit = getKitInstance();

        if (walletId) {
          const modules =
            (
              kit as {
                options?: { modules?: Array<{ id: string; name: string }> };
              }
            ).options?.modules || [];
          const target = modules.find(
            (m: { id: string; name: string }) => m.id === walletId,
          );
          resolvedName = target?.name || walletId;
          await handleWalletSelection(walletId, resolvedName);
        } else {
          await withTimeout(
            new Promise<void>((resolve, reject) => {
              kit
                .openModal({
                  modalTitle: "Connect to your favorite wallet",
                  onWalletSelected: async (option: ISupportedWallet) => {
                    try {
                      setLastAttemptedWalletId(option.id);
                      resolvedName = option.name;
                      await handleWalletSelection(option.id, option.name);
                      resolve();
                    } catch (err) {
                      reject(err);
                    }
                  },
                })
                .catch(reject);
            }),
            WALLET_CONNECT_TIMEOUT_MS,
            "Wallet modal connection",
          );
        }
      } catch (error: unknown) {
        if (generation !== connectGeneration.current) {
          return;
        }

        console.error("Connection failed raw value:", error);
        const classified = classifyWalletError(error, walletId, resolvedName);
        setConnectionError(classified);
        setConnectionStatus(
          classified.code === "canceled"
            ? "canceled"
            : classified.code === "timeout"
              ? "timeout"
              : "error",
        );
        setConnected(false);

        const errorObj =
          error instanceof Error ? error : new Error(classified.message);
        console.error("Connection failed details:", {
          message: errorObj.message,
          name: errorObj.name,
          code: classified.code,
        });

        throw error instanceof Error ? error : new Error(classified.message);
      }
    },
    [handleWalletSelection],
  );

  const disconnect = useCallback(async () => {
    connectGeneration.current += 1;
    await getKitInstance().disconnect();
    setConnected(false);
    setPublicKey(undefined);
    setWalletName(undefined);
    setBalances([]);
    setConnectionStatus("idle");
    setConnectionError(null);
    localStorage.clear();
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    try {
      const account = await server.accounts().accountId(publicKey).call();
      setBalances(account.balances);
    } catch {
      setBalances([]);
    }
  }, [publicKey, server]);

  return (
    <WalletConfigContext.Provider value={{ horizonUrl, network }}>
      <WalletContext.Provider
        value={{
          connected,
          publicKey,
          walletName,
          balances,
          connect,
          disconnect,
          refreshBalances,
          connectionStatus,
          connectionError,
          lastAttemptedWalletId,
          clearConnectionFeedback,
        }}
      >
        {children}
      </WalletContext.Provider>
    </WalletConfigContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
};
