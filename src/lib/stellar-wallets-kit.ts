import {
  StellarWalletsKit,
  FREIGHTER_ID,
  FreighterModule,
  AlbedoModule,
  LobstrModule,
  xBullModule,
  HanaModule,
  WalletNetwork,
  ModuleInterface,
} from "@creit.tech/stellar-wallets-kit";
import {
  getStellarConfig,
  type StellarNetworkConfig,
} from "@/lib/stellar-config";

// Placeholder for injected wallets
const INJECTED_WALLETS: string[] = ["freighter", "albedo", "lobstr"];

function buildModules(): ModuleInterface[] {
  const walletList = Array.isArray(INJECTED_WALLETS)
    ? INJECTED_WALLETS
    : ["freighter", "albedo", "lobstr"]; // Default fallback
  const modules: ModuleInterface[] = [];

  if (walletList.includes("freighter")) modules.push(new FreighterModule());
  if (walletList.includes("albedo")) modules.push(new AlbedoModule());
  if (walletList.includes("lobstr")) modules.push(new LobstrModule());
  if (walletList.includes("xbull")) modules.push(new xBullModule());
  if (walletList.includes("hana")) modules.push(new HanaModule());

  return modules.length > 0
    ? modules
    : [new FreighterModule(), new AlbedoModule(), new LobstrModule()];
}

// The kit carries the network it was constructed with, so it is cached together
// with the configuration that produced it. A configuration change (tests, dev
// reloads) invalidates the instance instead of leaving a stale network behind.
let kitInstance: StellarWalletsKit | null = null;
let kitConfig: StellarNetworkConfig | null = null;

/**
 * The Stellar wallets kit, bound to the same configuration Horizon reads use.
 * Never defaults to a network of its own — see issue #204.
 */
export const getKit = (
  config: StellarNetworkConfig = getStellarConfig(),
): StellarWalletsKit => {
  if (typeof window === "undefined") {
    return {} as StellarWalletsKit;
  }

  if (kitInstance && kitConfig && kitConfig === config) {
    return kitInstance;
  }

  kitInstance = new StellarWalletsKit({
    // ponytail: WalletNetwork is a string enum whose members ARE the official
    // passphrases (verified against @creit.tech/stellar-wallets-kit 1.9.5
    // types.d.ts), and parseStellarConfig guarantees networkPassphrase is one
    // of the two supported values. Upgrade path: validate via a runtime lookup
    // if a future kit version changes the enum.
    network: config.networkPassphrase as WalletNetwork,
    selectedWalletId: FREIGHTER_ID,
    modules: buildModules(),
  });
  kitConfig = config;

  return kitInstance;
};

/**
 * Drop the cached kit so the next `getKit()` rebuilds it from the current
 * configuration. Used by tests and by configuration hot-resets.
 */
export const resetKit = (): void => {
  kitInstance = null;
  kitConfig = null;
};

// Export as function to ensure lazy evaluation
export const kit = () => getKit();

interface signTransactionProps {
  unsignedTransaction: string;
  address: string;
}

/**
 * Sign with the intended network passphrase stated explicitly, so signing
 * cannot diverge from the network balances are read from.
 */
export const signTransaction = async ({
  unsignedTransaction,
  address,
}: signTransactionProps): Promise<string> => {
  const config = getStellarConfig();
  const { signedTxXdr } = await getKit(config).signTransaction(
    unsignedTransaction,
    {
      address,
      networkPassphrase: config.networkPassphrase,
    },
  );

  return signedTxXdr;
};
