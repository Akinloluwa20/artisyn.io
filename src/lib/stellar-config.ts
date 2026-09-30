import { Networks } from "@stellar/stellar-sdk";

/**
 * Single source of truth for the Stellar environment.
 *
 * Everything that touches a network — Horizon balance reads and wallet-kit
 * transaction signing — must resolve its network from here. Previously the
 * wallet kit was pinned to `WalletNetwork.TESTNET` while `WalletProvider`
 * accepted arbitrary Horizon/network props, so balances could be read from one
 * network while signatures were produced for another (issue #204).
 */

export type StellarNetworkName = "testnet" | "mainnet";

export interface StellarNetworkConfig {
  /** Canonical, typed network identifier. */
  network: StellarNetworkName;
  /**
   * Network passphrase used by Horizon clients and by tx signing. Doubles as
   * the wallet-kit `WalletNetwork` value: in
   * `@creit.tech/stellar-wallets-kit` 1.9.5 the enum members are these exact
   * passphrase strings.
   */
  networkPassphrase: string;
  /** Horizon server used for balance reads and tx submission. */
  horizonUrl: string;
  /** Optional explorer used by network badges / links. */
  explorerUrl: string;
}

/** Raw, unvalidated environment input (injectable so parsing is testable). */
export interface StellarEnvInput {
  NEXT_PUBLIC_STELLAR_NETWORK?: string;
  NEXT_PUBLIC_STELLAR_HORIZON_URL?: string;
  NEXT_PUBLIC_STELLAR_EXPLORER_URL?: string;
}

export const STELLAR_NETWORK_PASSPHRASES: Record<StellarNetworkName, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
};

export const STELLAR_NETWORK_LABELS: Record<StellarNetworkName, string> = {
  testnet: "Testnet",
  mainnet: "Mainnet",
};

const DEFAULT_HORIZON_URLS: Record<StellarNetworkName, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon-mainnet.stellar.org",
};

const DEFAULT_EXPLORER_URLS: Record<StellarNetworkName, string> = {
  testnet: "https://stellarexpert.com",
  mainnet: "https://stellar.expert",
};

/** Known Horizon hosts per network, used to infer the network when unset. */
const HORIZON_HOSTS: Record<StellarNetworkName, string[]> = {
  testnet: ["horizon-testnet.stellar.org"],
  mainnet: ["horizon-mainnet.stellar.org", "horizon.stellar.org"],
};

/** Official passphrase -> typed network name. */
const PASSPHRASE_TO_NETWORK: Record<string, StellarNetworkName> = {
  [Networks.TESTNET]: "testnet",
  [Networks.PUBLIC]: "mainnet",
};

export class StellarConfigError extends Error {
  constructor(message: string) {
    super(`Invalid Stellar configuration: ${message}`);
    this.name = "StellarConfigError";
  }
}

function normalizeNetwork(raw: string): string {
  return raw.trim().toLowerCase();
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseHorizonUrl(raw: string, envVar: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new StellarConfigError(
      `${envVar}="${raw}" is not a valid absolute URL.`,
    );
  }
  if (url.protocol !== "https:") {
    throw new StellarConfigError(
      `${envVar}="${raw}" must use https:// for the supported networks.`,
    );
  }
  return url;
}

/** Returns the network whose official Horizon host matches, else null. */
function networkFromHorizonHost(url: URL): StellarNetworkName | null {
  for (const [name, hosts] of Object.entries(HORIZON_HOSTS) as [
    StellarNetworkName,
    string[],
  ][]) {
    if (hosts.includes(url.host)) return name;
  }
  return null;
}

function assertPassphraseMatchesHorizon(
  network: StellarNetworkName,
  url: URL,
): void {
  const inferred = networkFromHorizonHost(url);
  if (inferred && inferred !== network) {
    throw new StellarConfigError(
      `network "${network}" (passphrase ${JSON.stringify(
        STELLAR_NETWORK_PASSPHRASES[network],
      )}) conflicts with Horizon host "${url.host}", which belongs to "${inferred}". ` +
        "Balance reads and transaction signing must target the same network.",
    );
  }
}

/**
 * Validate a Stellar environment. Pure: takes env values plus the production
 * flag so both can be exercised in tests.
 *
 * Rules:
 * - Only `testnet` and `mainnet` are supported (no futurenet/sandbox/standalone).
 * - An explicit `NEXT_PUBLIC_STELLAR_NETWORK` always wins.
 * - Without it, the network may be inferred from an official Horizon host.
 * - Production must configure explicitly: it can never silently default to testnet.
 */
export function parseStellarConfig(
  env: StellarEnvInput,
  { isProduction }: { isProduction: boolean },
): StellarNetworkConfig {
  const rawNetwork = env.NEXT_PUBLIC_STELLAR_NETWORK?.trim();
  const rawHorizon = env.NEXT_PUBLIC_STELLAR_HORIZON_URL?.trim();
  const rawExplorer = env.NEXT_PUBLIC_STELLAR_EXPLORER_URL?.trim();

  let network: StellarNetworkName;

  if (rawNetwork) {
    const normalized = normalizeNetwork(rawNetwork);
    if (normalized === "public" || normalized === "pubnet") {
      network = "mainnet";
    } else if (normalized === "testnet") {
      network = "testnet";
    } else if (normalized === "mainnet") {
      network = "mainnet";
    } else if (PASSPHRASE_TO_NETWORK[rawNetwork]) {
      // Allow passing the network passphrase itself.
      network = PASSPHRASE_TO_NETWORK[rawNetwork];
    } else if (PASSPHRASE_TO_NETWORK[normalizeNetwork(rawNetwork)]) {
      network = PASSPHRASE_TO_NETWORK[normalizeNetwork(rawNetwork)];
    } else {
      throw new StellarConfigError(
        `NEXT_PUBLIC_STELLAR_NETWORK="${rawNetwork}" is not supported. Use "testnet" or "mainnet".`,
      );
    }
  } else if (rawHorizon) {
    const inferred = networkFromHorizonHost(parseHorizonUrl(rawHorizon, "NEXT_PUBLIC_STELLAR_HORIZON_URL"));
    if (!inferred) {
      throw new StellarConfigError(
        `cannot infer the Stellar network from NEXT_PUBLIC_STELLAR_HORIZON_URL="${rawHorizon}". ` +
          'Set NEXT_PUBLIC_STELLAR_NETWORK="testnet" or "mainnet" explicitly.',
      );
    }
    network = inferred;
  } else if (isProduction) {
    throw new StellarConfigError(
      'NEXT_PUBLIC_STELLAR_NETWORK must be set to "testnet" or "mainnet" in production. ' +
        "Refusing to boot with an implicit testnet default.",
    );
  } else {
    network = "testnet";
  }

  const horizonUrl = stripTrailingSlash(
    rawHorizon || DEFAULT_HORIZON_URLS[network],
  );
  const horizon = parseHorizonUrl(horizonUrl, "NEXT_PUBLIC_STELLAR_HORIZON_URL");
  assertPassphraseMatchesHorizon(network, horizon);

  const explorerUrl = rawExplorer
    ? stripTrailingSlash(
        parseHorizonUrl(rawExplorer, "NEXT_PUBLIC_STELLAR_EXPLORER_URL").href,
      )
    : DEFAULT_EXPLORER_URLS[network];

  const networkPassphrase = STELLAR_NETWORK_PASSPHRASES[network];

  return {
    network,
    networkPassphrase,
    horizonUrl: stripTrailingSlash(horizon.href),
    explorerUrl: stripTrailingSlash(explorerUrl),
  };
}

function readStellarEnv(): StellarEnvInput {
  return {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_HORIZON_URL:
      process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
    NEXT_PUBLIC_STELLAR_EXPLORER_URL:
      process.env.NEXT_PUBLIC_STELLAR_EXPLORER_URL,
  };
}

/**
 * True when this process is a production *runtime*. `next build` also runs with
 * NODE_ENV=production but is only compiling, so it must not require deployment
 * secrets/variables; a real production boot does, and must fail loudly rather
 * than serve testnet.
 */
export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

/**
 * Cached by the exact configuration source, so a changed environment (tests,
 * dev reloads) can never leave a stale network behind.
 */
let cache: { key: string; config: StellarNetworkConfig } | null = null;

export function getStellarConfig(
  env: StellarEnvInput = readStellarEnv(),
  isProduction = isProductionRuntime(),
): StellarNetworkConfig {
  const key = JSON.stringify([env, isProduction]);
  if (cache && cache.key === key) return cache.config;
  const config = parseStellarConfig(env, { isProduction });
  cache = { key, config };
  return config;
}

/** Drop the cached configuration (used by tests and config hot-resets). */
export function resetStellarConfigCache(): void {
  cache = null;
}
