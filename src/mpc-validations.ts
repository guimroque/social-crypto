import assert from "assert";
import { webcrypto } from "crypto";
const { subtle } = webcrypto;

import { CryptoUtils } from "./crypto";
import { Wallet } from "./social-wallet";

const MESSAGE = "hello message!";
const PIN = "123456";

export const validateKeyPair = async () => {
  const pair = await CryptoUtils.generateKeyPair();
  assert(pair.privateKey !== undefined);
  assert(pair.publicKey !== undefined);

  const sig = await CryptoUtils.signMessage(MESSAGE, pair.privateKey);
  const isValidSign = await CryptoUtils.recoverAndVerify(
    MESSAGE,
    sig,
    pair.publicKey
  );
  const notValidSign = await CryptoUtils.recoverAndVerify(
    MESSAGE + "12",
    sig,
    pair.publicKey
  );

  assert(isValidSign === true);
  assert(notValidSign === false);

  console.log("✅ [KEY_PAR]");
};

export const validateEncryptKey = async () => {
  const pair = await CryptoUtils.generateKeyPair();
  assert(pair.privateKey !== undefined);
  assert(pair.publicKey !== undefined);

  const sig = await CryptoUtils.signMessage(MESSAGE, pair.privateKey);
  const isValidSign = await CryptoUtils.recoverAndVerify(
    MESSAGE,
    sig,
    pair.publicKey
  );

  assert(isValidSign === true);

  const exportedPriv = await subtle.exportKey("pkcs8", pair.privateKey);
  const encrypted = await CryptoUtils.encryptPrivateKey(
    Buffer.from(exportedPriv),
    PIN
  );
  assert(encrypted !== undefined);
  const decrypted = await CryptoUtils.decryptPrivateKey(encrypted, PIN);

  const signature = await CryptoUtils.signMessage(MESSAGE, decrypted);

  assert(signature !== undefined);
  const rec = await CryptoUtils.recoverAndVerify(
    MESSAGE,
    signature,
    pair.publicKey
  );

  assert(rec === true);
  console.log("✅ [ENCRYPTION_KEY]");
};

export const validateSocialWallet = async () => {
  const w = await Wallet.create(PIN);

  assert(w.publicKey !== undefined);
  assert(w.hardwareRef !== undefined);

  const wAux = await Wallet.load(PIN, w.hardwareRef);

  assert(wAux.publicKeyB256 === w.publicKeyB256);
  assert(wAux.hardwareRef === w.hardwareRef);

  const sig = await wAux.signMessage(MESSAGE);
  const isValidSign = await CryptoUtils.recoverAndVerify(
    MESSAGE,
    sig,
    w.publicKey
  );

  assert(isValidSign === true);

  console.log("✅ [LOAD_WALLET]");
};
