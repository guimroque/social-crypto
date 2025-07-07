import { CryptoUtils } from "./crypto";
import { randomUUID } from "crypto";
import { Server } from "./server";

export type WalletParams = {
  hardwareRef: string;
  publicKey: string;
  encriptedPrivateKey: string;
};

export class Wallet {
  hardwareRef: string;
  publicKey: string;

  private encryptedPrivateKey: string;

  protected constructor(params: WalletParams) {
    this.hardwareRef = params.hardwareRef;
    this.publicKey = params.publicKey;
    this.encryptedPrivateKey = params.encriptedPrivateKey;
  }

  static async create(pin: string): Promise<Wallet> {
    const pair = CryptoUtils.generateKeyPair();
    const hardwareRef = randomUUID(); // Simulate hardware reference

    const encrypted = CryptoUtils.encryptPrivateKey(
      Buffer.from(pair.privateKeyHex, "hex"),
      pin
    );

    const store = new Server();
    store.save(hardwareRef, {
      encryptedPrivateKey: encrypted,
      publicKey: pair.publicKeyHex,
    });

    return new Wallet({
      hardwareRef,
      publicKey: pair.publicKeyHex,
      encriptedPrivateKey: encrypted,
    });
  }

  static async load(pin: string, ref: string): Promise<Wallet> {
    const store = new Server();
    const walletData = store.get(ref);

    if (!walletData) {
      throw new Error("Wallet not found or invalid PIN");
    }

    const decryptedPrivateKey = await CryptoUtils.decryptPrivateKey(
      walletData.encryptedPrivateKey,
      pin
    );
    const isValid =
      CryptoUtils.getPublicKey(decryptedPrivateKey.toString("hex")) ===
      walletData.publicKey;

    if (!isValid) {
      throw new Error("Decrypted private key does not match public key");
    }

    return new Wallet({
      hardwareRef: ref,
      publicKey: walletData.publicKey,
      encriptedPrivateKey: walletData.encryptedPrivateKey,
    });
  }

  async getPrivateKey(pin: string): Promise<string> {
    const decryptedBuffer = await CryptoUtils.decryptPrivateKey(
      this.encryptedPrivateKey,
      pin
    );
    return decryptedBuffer.toString("hex");
  }

  async signMessage(message: string, pin: string): Promise<string> {
    const privateKeyHex = await this.getPrivateKey(pin);
    const { signatureHex } = CryptoUtils.signMessage(message, privateKeyHex);
    return signatureHex;
  }
}
