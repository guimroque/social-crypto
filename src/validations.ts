import { launchTestNode } from "fuels/test-utils";
import assert from "assert";
import { CryptoUtils } from "./crypto";
import { Wallet } from "./social-wallet";
import { bn, hexlify } from "fuels";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Script } from "./airfacts/scripts/Script";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export const validateWalletFlow = async () => {
  // Cria nova carteira
  const wallet = await Wallet.create(PIN);

  assert(wallet.hardwareRef !== undefined);
  assert(wallet.publicKey !== undefined);

  // Recupera a carteira do storage
  const loadedWallet = await Wallet.load(PIN, wallet.hardwareRef);

  assert(loadedWallet.hardwareRef === wallet.hardwareRef);
  assert(loadedWallet.publicKey === wallet.publicKey);

  // Assina mensagem
  const signature = await loadedWallet.signMessage(MESSAGE, PIN);

  // Valida assinatura
  const isValid = CryptoUtils.verifySignature(
    MESSAGE,
    signature,
    loadedWallet.publicKey
  );

  assert(isValid === true);

  console.log("✅ [WALLET_FLOW]");
};

export const validateScript = async () => {
  try {
    let node = await launchTestNode();
    const {
      wallets: [wallet],
      provider,
    } = node;
    const s_wallet = await Wallet.create(PIN);
    const chainId = await provider.getChainId();

    // Carrega o bytecode do script
    const script = new Script(wallet);

    const tx = await script.functions.main().getTransactionRequest();
    tx.addWitness(hexlify(new Uint8Array(64).fill(1)));

    const { assembledRequest } = await provider.assembleTx({
      request: tx,
      feePayerAccount: wallet,
      reserveGas: bn(100_000),
    });

    const signature = `0x${await s_wallet.signMessage(
      tx.getTransactionId(chainId),
      PIN
    )}`;

    tx.witnesses[0] = signature;

    // Envia a transação
    const txS = await wallet.sendTransaction(assembledRequest);
    const txRes = await txS.waitForResult();

    console.log({
      w: tx.witnesses[0],
      id: tx.getTransactionId(chainId),
    });
    console.log(txRes.logs);

    node.cleanup();
  } catch (e) {
    console.error("❌ [SCRIPT_FLOW]", e);
    throw e;
  }
};
