import { utils, Point } from "@noble/secp256k1";
import assert from "assert";
import { Address, hashMessage, Signer, WalletUnlocked } from "fuels";

// MPC:
// - a partir de uma chave publica
// - gere uma chave randomica
// - subtraia da publica

// - para ter a chave inicial, voce precisa do valor que foi subtraído
// - novamente somado

const CURVE_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);

/**
 * Divide uma chave privada em duas shares: userShare e cloudShare.
 */
export function splitKey(privKey: Uint8Array): {
  privKey: bigint;
  userShare: bigint;
  cloudShare: bigint;
  publicKey: string;
} {
  const privKeyBN = BigInt("0x" + Buffer.from(privKey).toString("hex"));

  const userShare = BigInt(
    "0x" + Buffer.from(utils.randomPrivateKey()).toString("hex")
  );
  const cloudShare = (privKeyBN - userShare + CURVE_ORDER) % CURVE_ORDER;

  const pubKey = Point.fromPrivateKey(privKeyBN).toHex(true);

  return {
    privKey: privKeyBN,
    userShare,
    cloudShare,
    publicKey: pubKey,
  };
}
/**
 * Reconstrói a chave privada a partir das duas shares.
 */
export function combineShares(userShare: bigint, cloudShare: bigint): bigint {
  return (userShare + cloudShare) % CURVE_ORDER;
}

/**
 * Converte um bigint para formatos b256.
 */
export function convertB256(value: bigint) {
  const b256 = value.toString(16).padStart(64, "0");
  const b256hex = "0x" + b256;
  const bytesLike = Uint8Array.from(Buffer.from(b256, "hex"));
  return { b256hex, b256, bytesLike };
}

async function testMPC() {
  const originalPrivKey = utils.randomPrivateKey();
  const result = splitKey(originalPrivKey);
  const reconstructed = combineShares(result.userShare, result.cloudShare);
  const message = Address.fromRandom().toAddress();

  assert(reconstructed.toString(16) === result.privKey.toString(16));

  console.log("[MPC]: ", {
    user: result.userShare.toString(16),
    origem: result.privKey.toString(16),
    cloud: result.cloudShare.toString(16),
    restaurada: reconstructed.toString(16),
    public: result.publicKey,
  });

  const conversions = convertB256(reconstructed);
  const w = new WalletUnlocked(conversions.bytesLike);

  const sig = await w.signMessage(message);
  assert(conversions.b256hex === w.privateKey);

  console.log("[WALLET]: ", {
    address: w.address.b256Address,
  });

  console.log(Signer.recoverAddress(hashMessage(message), sig).b256Address);
  console.log(Signer.recoverPublicKey(hashMessage(message), sig));
}

testMPC();
