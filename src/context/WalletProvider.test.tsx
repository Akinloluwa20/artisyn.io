import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WALLET_CONNECT_TIMEOUT_MS,
  WalletProvider,
  useWallet,
} from "./WalletProvider";

const kitMock = vi.hoisted(() => ({
  setWallet: vi.fn(),
  getAddress: vi.fn(),
  openModal: vi.fn(),
  disconnect: vi.fn(),
  options: { modules: [{ id: "freighter", name: "Freighter" }] },
}));

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stellar-wallets-kit", () => ({
  getKit: () => kitMock,
  kit: () => kitMock,
  resetKit: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  logout: logoutMock,
}));

// Stable config object so the provider's change-detection effect is a no-op.
vi.mock("@/lib/stellar-config", () => {
  const config = {
    network: "testnet" as const,
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/testnet",
  };
  return {
    getStellarConfig: () => config,
    resetStellarConfigCache: vi.fn(),
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: class {
      accounts() {
        return {
          accountId: () => ({
            call: () =>
              Promise.resolve({
                balances: [{ balance: "10.0", asset_type: "native" }],
              }),
          }),
        };
      }
    },
  },
}));

// The provider always runs inside a wallet context in these tests.
let walletApi: ReturnType<typeof useWallet>;

function Probe() {
  walletApi = useWallet();
  return (
    <div>
      <span data-testid="status">{walletApi.connectionStatus}</span>
      <span data-testid="connected">{String(walletApi.connected)}</span>
      <span data-testid="code">{walletApi.connectionError?.code ?? "none"}</span>
      <span data-testid="address">{walletApi.publicKey ?? "none"}</span>
      <span data-testid="balances">{walletApi.balances.length}</span>
      <button type="button" onClick={() => void walletApi.connect("freighter")}>
        connect
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <WalletProvider>
      <Probe />
    </WalletProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  kitMock.setWallet.mockReset();
  kitMock.getAddress.mockReset();
  kitMock.openModal.mockReset();
  kitMock.disconnect.mockReset();
  logoutMock.mockReset();
  logoutMock.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WalletProvider", () => {
  it("connects a named wallet and persists the session", async () => {
    kitMock.getAddress.mockResolvedValue({ address: "GALAXYADDRESS" });
    renderProvider();

    await act(async () => {
      await walletApi.connect("freighter");
    });

    expect(kitMock.setWallet).toHaveBeenCalledWith("freighter");
    expect(walletApi.connected).toBe(true);
    expect(walletApi.connectionStatus).toBe("connected");
    expect(walletApi.publicKey).toBe("GALAXYADDRESS");
    expect(screen.getByTestId("address")).toHaveTextContent("GALAXYADDRESS");
    expect(window.localStorage.getItem("stellar_wallet_connected")).toBe("true");
    expect(window.localStorage.getItem("stellar_wallet_address")).toBe(
      "GALAXYADDRESS",
    );

    await waitFor(() => expect(walletApi.balances).toHaveLength(1));
  });

  it("surfaces a rejected connection without staying connected", async () => {
    kitMock.getAddress.mockRejectedValue(
      new Error("Wallet rejected the connection"),
    );
    renderProvider();

    await act(async () => {
      await walletApi.connect("freighter").catch(() => {});
    });

    expect(walletApi.connectionStatus).toBe("error");
    expect(walletApi.connectionError?.code).toBe("rejected");
    expect(walletApi.connected).toBe(false);
    expect(walletApi.publicKey).toBeUndefined();
  });

  it("classifies a user cancellation as canceled", async () => {
    kitMock.getAddress.mockRejectedValue(new Error("User canceled the request"));
    renderProvider();

    await act(async () => {
      await walletApi.connect("freighter").catch(() => {});
    });

    expect(walletApi.connectionStatus).toBe("canceled");
    expect(walletApi.connectionError?.code).toBe("canceled");
  });

  it("times out a wallet that never responds", async () => {
    vi.useFakeTimers();
    kitMock.getAddress.mockReturnValue(new Promise(() => {}));
    renderProvider();

    act(() => {
      void walletApi.connect("freighter").catch(() => {});
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WALLET_CONNECT_TIMEOUT_MS + 1);
    });

    expect(walletApi.connectionStatus).toBe("timeout");
    expect(walletApi.connectionError?.code).toBe("timeout");
    expect(walletApi.connected).toBe(false);
  });

  it("connects through the modal when no wallet id is given", async () => {
    kitMock.getAddress.mockResolvedValue({ address: "GMODALADDRESS" });
    kitMock.openModal.mockImplementation(
      (opts: {
        onWalletSelected: (o: { id: string; name: string }) => Promise<void>;
      }) => opts.onWalletSelected({ id: "freighter", name: "Freighter" }),
    );
    renderProvider();

    await act(async () => {
      await walletApi.connect();
    });

    expect(kitMock.openModal).toHaveBeenCalledTimes(1);
    expect(walletApi.connected).toBe(true);
    expect(walletApi.publicKey).toBe("GMODALADDRESS");
    expect(walletApi.lastAttemptedWalletId).toBe("freighter");
  });

  it("clears connection feedback after a failure", async () => {
    kitMock.getAddress.mockRejectedValue(new Error("User denied"));
    renderProvider();

    await act(async () => {
      await walletApi.connect("freighter").catch(() => {});
    });
    expect(walletApi.connectionError).not.toBeNull();

    act(() => {
      walletApi.clearConnectionFeedback();
    });

    expect(walletApi.connectionError).toBeNull();
    expect(walletApi.connectionStatus).toBe("idle");
  });

  it("disconnects cleanly, revokes the session and clears persisted state", async () => {
    kitMock.getAddress.mockResolvedValue({ address: "GADDRESS" });
    kitMock.disconnect.mockResolvedValue(undefined);
    renderProvider();

    await act(async () => {
      await walletApi.connect("freighter");
    });
    expect(window.localStorage.getItem("stellar_wallet_connected")).toBe("true");

    await act(async () => {
      await walletApi.disconnect();
    });

    expect(kitMock.disconnect).toHaveBeenCalledTimes(1);
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(walletApi.connected).toBe(false);
    expect(walletApi.publicKey).toBeUndefined();
    expect(walletApi.balances).toEqual([]);
    expect(walletApi.connectionStatus).toBe("idle");
    expect(walletApi.connectionError).toBeNull();
    expect(window.localStorage.getItem("stellar_wallet_connected")).toBeNull();
  });
});
