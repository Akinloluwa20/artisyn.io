// Test stub for @creit.tech/stellar-wallets-kit (browser SDKs don't load under
// vitest's node environment). Enum members match the real passphrase strings.
export enum WalletNetwork {
  PUBLIC = "Public Global Stellar Network ; September 2015",
  TESTNET = "Test SDF Network ; September 2015",
}

export const FREIGHTER_ID = "freighter";

export class FreighterModule {
  id = FREIGHTER_ID;
  name = "Freighter";
}
export class AlbedoModule {
  id = "albedo";
  name = "Albedo";
}
export class LobstrModule {
  id = "lobstr";
  name = "Lobstr";
}
export class xBullModule {
  id = "xbull";
  name = "xBull";
}
export class HanaModule {
  id = "hana";
  name = "Hana";
}

export interface ModuleInterface {
  id: string;
  name: string;
}
export interface ISupportedWallet {
  id: string;
  name: string;
  icon: string;
  downloadableLink: string;
}

// Records last construction params so tests can assert the bound network.
export const __lastKitParams = { current: null as unknown };

export class StellarWalletsKit {
  public latestSignOpts: { networkPassphrase?: string; address?: string } | null =
    null;
  public signCount = 0;
  constructor(public params: {
    network: WalletNetwork;
    selectedWalletId?: string;
    modules: ModuleInterface[];
  }) {
    __lastKitParams.current = params;
  }
  setWallet(_id: string) {}
  async getAddress() {
    return { address: "GTEST" };
  }
  async signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) {
    this.latestSignOpts = opts ?? null;
    this.signCount += 1;
    return { signedTxXdr: `signed:${xdr}`, signerAddress: opts?.address };
  }
  async disconnect() {}
  get options() {
    return { modules: [] as ModuleInterface[] };
  }
}
