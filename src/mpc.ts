// === MPC (Additive Sharing) ===
// - Start from a private key
// - Generate a random key (user share)
// - Subtract the random key from the private key to create the cloud share
//
// - To reconstruct the original key, you must add the user share back to the cloud share
// - Without both parts, the original private key cannot be recovered
//
// This is a simple 2-of-2 secret sharing scheme (both parts are required).

// === SSS (Shamir's Secret Sharing) ===
// - Start from a private key
// - Encode it as the constant term of a randomly generated polynomial
// - Generate N points on the polynomial (shares) using different x coordinates
//
// - To reconstruct the key, you only need a subset of the shares (threshold t)
// - With fewer than t shares, no information about the original key is revealed
//
// This is a threshold-based scheme (e.g., 2-of-3, 3-of-5) that provides better fault tolerance.

import { utils, Point } from "@noble/secp256k1";
import {
  split as shamirSplit,
  combine as shamirCombine,
} from "shamirs-secret-sharing-ts";
import { Address, hashMessage, Signer, WalletUnlocked } from "fuels";
import assert from "assert";

const CURVE_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);

function toHex(bytes: Uint8Array): string {
  return "0x" + Buffer.from(bytes).toString("hex");
}

function toBytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
}

function bigintToBytes(value: bigint): Uint8Array {
  return toBytes(value.toString(16).padStart(64, "0"));
}

function bytesToBigint(bytes: Uint8Array): bigint {
  return BigInt("0x" + Buffer.from(bytes).toString("hex"));
}

/**
 * Divide uma chave privada em duas shares: userShare e cloudShare.
 */
export function splitKey(privKey: Uint8Array): {
  privateKey: { bytes: Uint8Array; hex: string };
  userShare: { bytes: Uint8Array; hex: string };
  cloudShare: { bytes: Uint8Array; hex: string };
  publicKey: { bytes: Uint8Array; hex: string };
} {
  const privKeyBN = bytesToBigint(privKey);
  const userShareBN = bytesToBigint(utils.randomPrivateKey());
  const cloudShareBN = (privKeyBN - userShareBN + CURVE_ORDER) % CURVE_ORDER;

  const publicKeyBytes = Point.fromPrivateKey(privKeyBN).toRawBytes(true);

  return {
    privateKey: { bytes: privKey, hex: toHex(privKey) },
    userShare: {
      bytes: bigintToBytes(userShareBN),
      hex: toHex(bigintToBytes(userShareBN)),
    },
    cloudShare: {
      bytes: bigintToBytes(cloudShareBN),
      hex: toHex(bigintToBytes(cloudShareBN)),
    },
    publicKey: { bytes: publicKeyBytes, hex: toHex(publicKeyBytes) },
  };
}

/**
 * Reconstrói a chave privada a partir das duas shares.
 */
export function combineShares(
  user: Uint8Array,
  cloud: Uint8Array
): {
  privateKey: { bytes: Uint8Array; hex: string };
} {
  const userBN = bytesToBigint(user);
  const cloudBN = bytesToBigint(cloud);
  const reconstructedBN = (userBN + cloudBN) % CURVE_ORDER;
  const bytes = bigintToBytes(reconstructedBN);
  return { privateKey: { bytes, hex: toHex(bytes) } };
}

/**
 * Cria shares de uma chave privada usando Shamir's Secret Sharing.
 */
export function createShares(
  privKey: Uint8Array,
  total: number,
  threshold: number
): { bytes: Uint8Array; hex: string }[] {
  const shares = shamirSplit(Buffer.from(privKey), {
    shares: total,
    threshold,
  });
  return shares.map((s) => {
    const bytes = new Uint8Array(s);
    return { bytes, hex: toHex(bytes) };
  });
}

/**
 * Recupera a chave original a partir de shares.
 */
export function recoverKey(shares: Uint8Array[]): {
  privateKey: { bytes: Uint8Array; hex: string };
} {
  const buffers = shares.map((s) => Buffer.from(s));
  const recovered = new Uint8Array(shamirCombine(buffers));
  return { privateKey: { bytes: recovered, hex: toHex(recovered) } };
}

async function testMPC() {
  const originalPrivKey = utils.randomPrivateKey();

  const result = splitKey(originalPrivKey);
  const shares = createShares(originalPrivKey, 3, 2);

  const recover_mpc = combineShares(
    result.userShare.bytes,
    result.cloudShare.bytes
  );

  const recover_sss = recoverKey(shares.slice(-2).map((i) => i.bytes));
  const message = Address.fromRandom().toAddress();

  const wallet_mpc = new WalletUnlocked(recover_mpc.privateKey.bytes);
  const wallet_sss = new WalletUnlocked(recover_sss.privateKey.bytes);

  const sig_mpc = await wallet_mpc.signMessage(message);
  const sig_sss = await wallet_sss.signMessage(message);

  const recover_message_mpc = Signer.recoverAddress(
    hashMessage(message),
    sig_mpc
  ).b256Address;

  const recover_message_sss = Signer.recoverAddress(
    hashMessage(message),
    sig_sss
  ).b256Address;

  console.log("[WALLET]", {
    address_mpc: wallet_mpc.address.b256Address,
    address_sss: wallet_sss.address.b256Address,
  });

  assert(wallet_mpc.address.b256Address === wallet_sss.address.b256Address);
  assert(recover_message_mpc === recover_message_sss);
  assert(wallet_mpc.address.b256Address === recover_message_sss);
}

testMPC();
