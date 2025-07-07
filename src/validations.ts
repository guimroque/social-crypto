import { launchTestNode } from "fuels/test-utils";
import assert from "assert";
import { CryptoUtils } from "./crypto";
import { bakoCoder, SignatureType, Vault } from "bakosafe";
import { Address, bn, hashMessage, Signer } from "fuels";
import { Wallet } from "./social-wallet";

const MESSAGE = "hello message!";
const PIN = "123456";

export const validateKeyPair = () => {
  const pair = CryptoUtils.generateKeyPair();
  assert(pair.privateKeyHex !== undefined);
  assert(pair.publicKeyHex !== undefined);

  const { signatureHex, recovery } = CryptoUtils.signMessage(
    MESSAGE,
    pair.privateKeyHex
  );

  const recoveredPub = CryptoUtils.recoverPublicKeyHex(
    MESSAGE,
    signatureHex,
    recovery
  );

  assert(recoveredPub === pair.publicKeyHex);

  const isValid = CryptoUtils.verifySignature(
    MESSAGE,
    signatureHex,
    pair.publicKeyHex
  );

  assert(isValid === true);

  const isInvalid = CryptoUtils.verifySignature(
    MESSAGE + " altered",
    signatureHex,
    pair.publicKeyHex
  );

  assert(isInvalid === false);

  console.log("✅ [KEY_PAIR]");
};

export const validateEncryptionFlow = async () => {
  const pair = CryptoUtils.generateKeyPair();

  const { signatureHex } = CryptoUtils.signMessage(MESSAGE, pair.privateKeyHex);

  const isValid = CryptoUtils.verifySignature(
    MESSAGE,
    signatureHex,
    pair.publicKeyHex
  );

  assert(isValid === true);

  const privBuffer = Buffer.from(pair.privateKeyHex, "hex");
  const encrypted = CryptoUtils.encryptPrivateKey(privBuffer, PIN);
  assert(encrypted !== undefined);

  const decryptedBuffer = await CryptoUtils.decryptPrivateKey(encrypted, PIN);
  const decryptedHex = decryptedBuffer.toString("hex");

  assert(decryptedHex === pair.privateKeyHex);

  const newSignature = CryptoUtils.signMessage(MESSAGE, decryptedHex);

  const isValidNew = CryptoUtils.verifySignature(
    MESSAGE,
    newSignature.signatureHex,
    pair.publicKeyHex
  );

  assert(isValidNew === true);

  console.log("✅ [ENCRYPTION_FLOW]");
};

export const validateSignatureRecovery = async () => {
  const pair = CryptoUtils.generateKeyPair();

  const message = "hello message!";

  const sig = CryptoUtils.signMessage(message, pair.privateKeyHex);

  const publicKey = CryptoUtils.recoverPublicKeyHex(
    message,
    sig.signatureHex,
    sig.recovery
  );

  assert(publicKey === pair.publicKeyHex);
  console.log("✅ [RECOVER_FLOW]");
};

export const validateScript = async () => {
  try {
    let node = await launchTestNode();
    const {
      wallets: [wallet],
      provider,
    } = node;
    const hash = Address.fromRandom().toB256();

    const w = await Wallet.create(PIN, provider);

    const sig = await w.signMessage(hash, PIN);
    const rec = Signer.recoverAddress(hashMessage(hash), sig);

    // console.log("[DATA]: ", {
    //   sig,
    //   hash,
    //   rec: rec.b256Address,
    //   public: w.publicKey,
    // });

    assert(w.publicKey === rec.b256Address);

    // const vault = new Vault(provider, {
    //   SIGNATURES_COUNT: 1,
    //   SIGNERS: [w_social.publicKey],
    // });
    // await wallet
    //   .transfer(vault.address, bn.parseUnits("0.1"))
    //   .then(async (t) => {
    //     await t.waitForResult();
    //   });

    // const { tx, hashTxId } = await vault.transaction({
    //   name: "teste",
    //   assets: [
    //     {
    //       to: wallet.address.b256Address,
    //       amount: "0.001",
    //       assetId: await provider.getBaseAssetId(),
    //     },
    //   ],
    // });

    // const sig = await w_social.signMessage(hashTxId, PIN);
    // tx.witnesses = bakoCoder.encode([
    //   {
    //     type: SignatureType.Fuel,
    //     signature: `0x${sig}`,
    //   },
    // ]);

    // const res = await vault.send(tx);
    // const r = await res.waitForResult();
    // console.log(r);

    node.cleanup();
  } catch (e) {
    console.error("❌ [SCRIPT_FLOW]", e);
    throw e;
  }
};
