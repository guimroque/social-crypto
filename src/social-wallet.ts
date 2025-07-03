import { Vault, BakoProvider } from "bakosafe";
import { CryptoUtils } from "./crypto";
import { webcrypto } from "crypto";
import { randomUUID } from "crypto";
import { JsonStore } from "./server";

const { subtle } = webcrypto;

export type WalletParams = {
  hardwareRef: string;
  publicKeyB256: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
};

export class Wallet {
  hardwareRef: string;
  publicKeyB256: string;
  publicKey: CryptoKey;

  protected privateKey: CryptoKey;

  protected constructor(params: WalletParams) {
    this.hardwareRef = params.hardwareRef;
    this.publicKeyB256 = params.publicKeyB256;
    this.publicKey = params.publicKey;
    this.privateKey = params.privateKey;
  }

  static async create(pin: string): Promise<Wallet> {
    // Generate a new key pair
    const pair = await CryptoUtils.generateKeyPair();
    const hardwareRef = randomUUID(); // Simulate hardware reference

    // Store the private key securely using AES-256-GCM
    const exportedPriv = await subtle.exportKey("pkcs8", pair.privateKey);
    const exportedPublic = await subtle.exportKey("spki", pair.publicKey);
    const encrypted = await CryptoUtils.encryptPrivateKey(
      Buffer.from(exportedPriv),
      pin
    );

    const store = new JsonStore();
    store.save(hardwareRef, {
      encryptedPrivateKey: encrypted,
      publicKeyb256: await CryptoUtils.getPublicKeyFromPair(pair.publicKey),
      publicKeyHex: Buffer.from(exportedPublic).toString("hex"),
    });

    return new Wallet({
      hardwareRef,
      publicKeyB256: await CryptoUtils.getPublicKeyFromPair(pair.publicKey),
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
    });
  }

  static async load(pin: string, ref: string): Promise<Wallet> {
    const store = new JsonStore();
    const walletData = store.get(ref);

    if (!walletData) {
      throw new Error("Wallet not found or invalid PIN");
    }

    const decryptedPrivateKey = await CryptoUtils.decryptPrivateKey(
      walletData.encryptedPrivateKey,
      pin
    );

    return new Wallet({
      hardwareRef: ref,
      publicKey: walletData,
      privateKey: decryptedPrivateKey,
      publicKeyB256: walletData.publicKeyb256,
    });
  }

  async signMessage(message: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error("Private key not available for signing");
    }
    return CryptoUtils.signMessage(message, this.privateKey);
  }
}
