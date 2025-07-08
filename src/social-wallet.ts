import { randomUUID } from "crypto";
import { Server } from "./server";
import {
  Address,
  BigNumberish,
  BN,
  BytesLike,
  decrypt,
  encrypt,
  GetBalancesResponse,
  hexlify,
  Provider,
  TransactionRequestLike,
  TransactionResponse,
  TxParamsType,
  WalletUnlocked,
} from "fuels";
import { bakoCoder, SignatureType, Vault } from "bakosafe";

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
      datetime: new Date().getTime(),
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

  get socialAddress(): string {
    return this.vault.address.toB256();
  }

  async balance(): Promise<GetBalancesResponse> {
    return await this.vault.getBalances();
  }

  async signMessage(message: string, pin?: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  async sendTransaction(
    _address: string,
    _transaction: TransactionRequestLike
  ) {
    const { tx, hashTxId } = await this.vault.BakoTransfer(_transaction);
    const signature = await this.signMessage(hashTxId);
    tx.witnesses = bakoCoder.encode([{ signature, type: SignatureType.Fuel }]);

    return await this.vault.send(tx);
  }

  async transfer(
    address: string,
    amount: BigNumberish,
    assetId?: BytesLike
  ): Promise<TransactionResponse> {
    const { tx, hashTxId } = await this.vault.transaction({
      name: randomUUID(),
      assets: [
        {
          amount: new BN(amount.toString()).formatUnits(),
          assetId: assetId
            ? hexlify(assetId)
            : await this.vault.provider.getBaseAssetId(),
          to: address,
        },
      ],
    });

    const signature = await this.signMessage(hashTxId);

    tx.witnesses = bakoCoder.encode([
      {
        signature,
        type: SignatureType.Fuel,
      },
    ]);

    return await this.vault.send(tx);
  }
}
