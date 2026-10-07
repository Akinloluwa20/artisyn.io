import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import {
  getStellarConfig,
  parseStellarConfig,
  resetStellarConfigCache,
  StellarConfigError,
  STELLAR_NETWORK_PASSPHRASES,
} from "@/lib/stellar-config";
import { getKit, resetKit, signTransaction } from "@/lib/stellar-wallets-kit";
import { WalletNetwork } from "@creit.tech/stellar-wallets-kit";

describe("parseStellarConfig — valid configurations", () => {
  test("testnet configuration", () => {
    const cfg = parseStellarConfig(
      {
        NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
        NEXT_PUBLIC_STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
      },
      { isProduction: false },
    );
    expect(cfg.network).toBe("testnet");
    expect(cfg.networkPassphrase).toBe(Networks.TESTNET);
    expect(cfg.horizonUrl).toBe("https://horizon-testnet.stellar.org");
  });

  test("mainnet configuration", () => {
    const cfg = parseStellarConfig(
      {
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        NEXT_PUBLIC_STELLAR_HORIZON_URL: "https://horizon-mainnet.stellar.org",
      },
      { isProduction: true },
    );
    expect(cfg.network).toBe("mainnet");
    expect(cfg.networkPassphrase).toBe(Networks.PUBLIC);
    expect(cfg.horizonUrl).toBe("https://horizon-mainnet.stellar.org");
  });

  test("accepts the raw mainnet passphrase as network input", () => {
    const cfg = parseStellarConfig(
      {
        NEXT_PUBLIC_STELLAR_NETWORK: Networks.PUBLIC,
        NEXT_PUBLIC_STELLAR_HORIZON_URL: "https://horizon-mainnet.stellar.org",
      },
      { isProduction: false },
    );
    expect(cfg.network).toBe("mainnet");
  });

  test("trailing slashes are stripped from Horizon and explorer URLs", () => {
    const cfg = parseStellarConfig(
      {
        NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
        NEXT_PUBLIC_STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org/",
        NEXT_PUBLIC_STELLAR_EXPLORER_URL: "https://stellar.expert/",
      },
      { isProduction: false },
    );
    expect(cfg.horizonUrl).toBe("https://horizon-testnet.stellar.org");
    expect(cfg.explorerUrl).toBe("https://stellar.expert");
  });
});

describe("parseStellarConfig — invalid / unsafe configurations", () => {
  test("unsupported network name is rejected", () => {
    expect(() =>
      parseStellarConfig(
        { NEXT_PUBLIC_STELLAR_NETWORK: "futurenet" },
        { isProduction: false },
      ),
    ).toThrow(StellarConfigError);
  });

  test("unknown passphrase is rejected", () => {
    expect(() =>
      parseStellarConfig(
        { NEXT_PUBLIC_STELLAR_NETWORK: "Some Other Network ; 2023" },
        { isProduction: false },
      ),
    ).toThrow(StellarConfigError);
  });

  test("network/Horizon mismatch is rejected", () => {
    expect(() =>
      parseStellarConfig(
        {
          NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
          NEXT_PUBLIC_STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
        },
        { isProduction: true },
      ),
    ).toThrow(/conflicts with Horizon host/);
  });

  test("non-https Horizon URL is rejected", () => {
    expect(() =>
      parseStellarConfig(
        {
          NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
          NEXT_PUBLIC_STELLAR_HORIZON_URL: "http://localhost:8000",
        },
        { isProduction: false },
      ),
    ).toThrow(/https/);
  });

  test("production refuses to boot without an explicit network", () => {
    expect(() => parseStellarConfig({}, { isProduction: true })).toThrow(
      /must be set/,
    );
  });

  test("non-production defaults to testnet when nothing is set", () => {
    const cfg = parseStellarConfig({}, { isProduction: false });
    expect(cfg.network).toBe("testnet");
    expect(cfg.horizonUrl).toBe("https://horizon-testnet.stellar.org");
  });
});

describe("getStellarConfig caching", () => {
  beforeEach(() => resetStellarConfigCache());

  test("identical environment returns the cached instance", () => {
    const a = getStellarConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "testnet" }, false);
    const b = getStellarConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "testnet" }, false);
    expect(b).toBe(a);
  });

  test("changed environment yields a freshly parsed configuration", () => {
    resetStellarConfigCache();
    const before = getStellarConfig(
      { NEXT_PUBLIC_STELLAR_NETWORK: "testnet" },
      false,
    );
    const after = getStellarConfig(
      { NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" },
      false,
    );
    expect(before.network).toBe("testnet");
    expect(after.network).toBe("mainnet");
    expect(after).not.toBe(before);
  });
});

describe("wallet kit binds to the configured network", () => {
  beforeEach(() => {
    // getKit() is browser-only by design; stub the global so the node test
    // environment exercises the real construction path.
    vi.stubGlobal("window", {});
    resetKit();
    resetStellarConfigCache();
  });

  test("kit is constructed with the configured wallet network", () => {
    const cfg = getStellarConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" }, false);
    const kit = getKit(cfg) as unknown as {
      params: { network: WalletNetwork };
    };
    expect(kit.params.network).toBe(WalletNetwork.PUBLIC);
  });

  test("kit rebuilds when the configuration changes (no stale network)", () => {
    const testnetCfg = getStellarConfig(
      { NEXT_PUBLIC_STELLAR_NETWORK: "testnet" },
      false,
    );
    const first = getKit(testnetCfg);
    const mainnetCfg = getStellarConfig(
      { NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" },
      false,
    );
    const second = getKit(mainnetCfg);
    expect(second).not.toBe(first);
    expect(
      (second as unknown as { params: { network: WalletNetwork } }).params
        .network,
    ).toBe(WalletNetwork.PUBLIC);
  });

  test("kit is reused when the configuration object is unchanged", () => {
    const cfg = getStellarConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "testnet" }, false);
    expect(getKit(cfg)).toBe(getKit(cfg));
  });
});

describe("signTransaction passes the intended network passphrase", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    resetKit();
    resetStellarConfigCache();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    delete process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;
    resetKit();
    resetStellarConfigCache();
  });

  test("mainnet signing receives the mainnet passphrase", async () => {
    // signTransaction resolves config from the environment, like the app does.
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    resetStellarConfigCache();
    await signTransaction({ unsignedTransaction: "XDR", address: "GABC" });
    const kit = getKit() as unknown as {
      latestSignOpts: { networkPassphrase?: string; address?: string } | null;
    };
    expect(kit.latestSignOpts).toEqual({
      address: "GABC",
      networkPassphrase: STELLAR_NETWORK_PASSPHRASES.mainnet,
    });
  });

  test("signing passphrase equals the Horizon read network passphrase", async () => {
    // The core invariant of #204: same source for reads and signing.
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    resetStellarConfigCache();
    const cfg = getStellarConfig();
    await signTransaction({ unsignedTransaction: "XDR", address: "GABC" });
    const kit = getKit(cfg) as unknown as {
      latestSignOpts: { networkPassphrase?: string } | null;
    };
    expect(kit.latestSignOpts?.networkPassphrase).toBe(cfg.networkPassphrase);
  });
});
