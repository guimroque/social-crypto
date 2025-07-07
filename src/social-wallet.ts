import { randomUUID } from "crypto";
import { Server } from "./server";
import {
  Address,
  assert,
  decrypt,
  encrypt,
  Keystore,
  Provider,
  WalletUnlocked,
} from "fuels";
import { Vault } from "bakosafe";

export type WalletParams = {
  hardwareRef: string;
  publicKey: string;
  wallet: WalletUnlocked;
  vault: Vault;
};

export class Wallet {
  hardwareRef: string;
  publicKey: string;

  private wallet: WalletUnlocked;
  private vault: Vault;

  protected constructor(params: WalletParams) {
    this.hardwareRef = params.hardwareRef;
    this.publicKey = params.publicKey;
    this.wallet = params.wallet;
    this.vault = params.vault;
  }

  static async create(pin: string, provider: Provider): Promise<Wallet> {
    const hardwareRef = randomUUID();
    const store = new Server();
    const wallet = WalletUnlocked.generate();

    const encrypted = await encrypt(pin, wallet.privateKey);
    const publicKey = new Address(wallet.publicKey).toB256();

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [publicKey],
    });

    store.save(hardwareRef, {
      encryptedPrivateKey: encrypted,
      publicKey: wallet.publicKey,
      bakoAddress: vault.address.toB256(),
    });

    return new Wallet({
      hardwareRef,
      publicKey,
      wallet,
      vault,
    });
  }

  static async load(
    pin: string,
    ref: string,
    provider: Provider
  ): Promise<Wallet> {
    const store = new Server();
    const walletData = store.get(ref);

    if (!walletData) {
      throw new Error("Wallet not found");
    }

    const dec: string = await decrypt(pin, walletData.encriptedPrivateKey);
    if (walletData.publicKey !== dec) {
      throw new Error("Invalid PIN");
    }
    const wallet = new WalletUnlocked(dec);
    const publicKey = new Address(wallet.publicKey).toB256();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [publicKey],
    });

    return new Wallet({
      hardwareRef: ref,
      publicKey,
      wallet,
      vault,
    });
  }

  async signMessage(message: string, pin: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }
}
