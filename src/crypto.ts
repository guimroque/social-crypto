import crypto from "crypto";
import * as secp from "@noble/secp256k1";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha256.js";
import { keccak_256 } from "@noble/hashes/sha3";

// Registers HMAC for deterministic signatures (RFC6979)
secp.etc.hmacSha256Sync = (key, ...msgs) =>
  hmac(sha256, key, secp.etc.concatBytes(...msgs));

export class CryptoUtils {
  /**
   * Generates a key pair in hex format.
   * @returns Object containing privateKeyHex (32 bytes) and compressed publicKeyHex (33 bytes).
   */
  static generateKeyPair(): { privateKeyHex: string; publicKeyHex: string } {
    const privateKey = secp.utils.randomPrivateKey();
    const publicKey = secp.getPublicKey(privateKey, true); // compressed
    return {
      privateKeyHex: Buffer.from(privateKey).toString("hex"),
      publicKeyHex: Buffer.from(publicKey).toString("hex"),
    };
  }

  /**
   * Signs a message with a private key in hex format.
   * @param message Plain text message.
   * @param privateKeyHex Private key in hex format.
   * @returns Object with signatureHex (r + s) and recovery bit (0 or 1).
   */
  static signMessage(
    message: string,
    privateKeyHex: string
  ): { signatureHex: string; recovery: number } {
    const msgHash = crypto.createHash("sha256").update(message).digest();
    const priv = Buffer.from(privateKeyHex, "hex");
    const sig = secp.sign(msgHash, priv); // synchronous, deterministic
    const signatureHex = Buffer.from(sig.toBytes()).toString("hex");
    return { signatureHex, recovery: sig.recovery };
  }

  static signMessageForFuel(
    message: string,
    privateKeyHex: string
  ): { fullSignatureHex: string; messageHashHex: string } {
    const msgHash = keccak_256(Buffer.from(message));
    const priv = Buffer.from(privateKeyHex, "hex");

    const sig = secp.sign(msgHash, priv);

    const signatureHex = Buffer.from(sig.toCompactRawBytes()).toString("hex");
    const recovery = sig.recovery;

    const fullSignature = Buffer.concat([
      Buffer.from(signatureHex, "hex"),
      Buffer.from([recovery]),
    ]);

    console.log(fullSignature.toString("hex"));

    return {
      fullSignatureHex: `0x${fullSignature.toString("hex")}`,
      messageHashHex: Buffer.from(msgHash).toString("hex"),
    };
  }

  /**
   * Verifies an ECDSA signature using the original message and public key.
   * @param message Plain text message.
   * @param signatureHex Signature in hex format (r + s).
   * @param publicKeyHex Compressed public key in hex format (33 bytes).
   * @returns True if valid, false otherwise.
   */
  static verifySignature(
    message: string,
    signatureHex: string,
    publicKeyHex: string
  ): boolean {
    const msgHash = crypto.createHash("sha256").update(message).digest();
    const signature = Uint8Array.from(Buffer.from(signatureHex, "hex"));
    const pub = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
    return secp.verify(signature, msgHash, pub);
  }

  /**
   * Derives a compressed public key (33 bytes) from a private key in hex format.
   * @param privateKeyHex Private key in hex format.
   * @returns Compressed public key in hex format.
   */
  static getPublicKey(privateKeyHex: string): string {
    const priv = Uint8Array.from(Buffer.from(privateKeyHex, "hex"));
    const pub = secp.getPublicKey(priv, false); // uncompressed
    return `0x${Buffer.from(pub).toString("hex")}`;
  }

  /**
   * Performs ECDH key agreement to derive a shared secret.
   * @param privateKeyHex Private key in hex format.
   * @param publicKeyHex Compressed public key in hex format.
   * @returns Shared secret in hex format.
   */
  static getSharedSecret(privateKeyHex: string, publicKeyHex: string): string {
    const priv = Uint8Array.from(Buffer.from(privateKeyHex, "hex"));
    const pub = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
    const secret = secp.getSharedSecret(priv, pub);
    return Buffer.from(secret).toString("hex");
  }

  /**
   * Encrypts a private key buffer using a PIN with AES-256-GCM.
   * @param privateKeyBuffer Private key as Buffer.
   * @param pin String used to derive the symmetric key.
   * @returns Encrypted private key in hex format (IV + TAG + Ciphertext).
   */
  static encryptPrivateKey(privateKeyBuffer: Buffer, pin: string): string {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash("sha256").update(pin).digest();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKeyBuffer),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("hex");
  }

  /**
   * Decrypts a previously encrypted private key using a PIN.
   * @param encryptedHex Encrypted private key in hex format (IV + TAG + Ciphertext).
   * @param pin String used to derive the symmetric key.
   * @returns Decrypted private key as Buffer.
   */
  static async decryptPrivateKey(
    encryptedHex: string,
    pin: string
  ): Promise<Buffer> {
    console.log("[DECIPT]");
    const buf = Buffer.from(encryptedHex, "hex");
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const encrypted = buf.slice(28);
    const key = crypto.createHash("sha256").update(pin).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    console.log("[DECIPT_1]");
    decipher.setAuthTag(tag);
    console.log("[DECIPT_2]");
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Recovers the compressed public key from a signed message.
   * @param message Original plain text message.
   * @param signatureHex Signature in hex format (r + s).
   * @param recoveryBit Recovery bit (0 or 1).
   * @returns Compressed public key in hex format.
   * @throws Error if recovery fails or invalid signature.
   */
  static recoverPublicKeyHex(
    message: string,
    signatureHex: string,
    recoveryBit: number
  ): string {
    const msgHash = crypto.createHash("sha256").update(message).digest();
    const signature =
      secp.Signature.fromCompact(signatureHex).addRecoveryBit(recoveryBit);

    if (!signature) {
      throw new Error("Invalid signature format");
    }

    const pubBytes = signature.recoverPublicKey(msgHash).toRawBytes(true);

    return Buffer.from(pubBytes).toString("hex");
  }
}
