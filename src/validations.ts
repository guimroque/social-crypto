import { launchTestNode } from "fuels/test-utils";
import assert from "assert";
import {
  Address,
  bn,
  hashMessage,
  Provider,
  Signer,
  WalletUnlocked,
} from "fuels";
import { Wallet } from "./social-wallet";

const PIN = process.env.PIN!;
const WALLET_KEY = process.env.WALLET_KEY!;
const NODE_URL = process.env.NODE_URL!;

export const validateSignature = async () => {
  try {
    let node = await launchTestNode();
    const { provider } = node;
    const hash = Address.fromRandom().toB256();
    const w = await Wallet.create(PIN, provider);

    const sig = await w.signMessage(hash, PIN);
    const rec = Signer.recoverAddress(hashMessage(hash), sig);

    assert(w.publicKey === rec.b256Address);
    node.cleanup();
  } catch (e) {
    console.error("❌ [SCRIPT_FLOW]", e);
    throw e;
  }
};

export const validateWallet = async () => {
  try {
    const provider = new Provider(
      NODE_URL ?? "https://testnet.fuel.network/v1/graphql"
    );
    const wallet = new WalletUnlocked(WALLET_KEY, provider);

    const assetId = await provider.getBaseAssetId();
    const w = await Wallet.create(PIN, provider);
    await wallet
      .transfer(w.socialAddress, bn.parseUnits("0.0001"))
      .then(async (t) => {
        await t.waitForResult();
      });

    const b_before = await w.balance().then((r) => {
      return r.balances.find((b) => b.assetId === assetId);
    });

    const res = await w.transfer(
      wallet.address.toB256(),
      bn.parseUnits("0.00001")
    );

    await res.waitForResult();

    const b_after = await w.balance().then((r) => {
      return r.balances.find((b) => b.assetId === assetId);
    });

    const isValid =
      b_after!.amount.formatUnits() < b_before!.amount.formatUnits();

    assert(isValid);
  } catch (e) {
    console.error("❌ [SCRIPT_FLOW]", e);
    throw e;
  }
};
