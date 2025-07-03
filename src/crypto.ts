import crypto, { subtle } from "crypto";

/**
 * CryptoUtils provides key generation, message signing, verification,
 * and secure encryption of private keys using AES-256-GCM and PIN-based protection.
 */
export class CryptoUtils {
  /**
   * Generates an ECDSA P-256 key pair for digital signatures.
   * @returns CryptoKeyPair containing the private and public keys.
   */
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
  }

  /**
   * Exports the public key from a CryptoKeyPair as a hexadecimal string.
   * The public key is hashed using SHA-256 to create a unique identifier.
   * @param pair The CryptoKeyPair containing the public key.
   * @returns Hexadecimal string of the public key hash.
   */
  static async getPublicKeyFromPair(publicKey: CryptoKey): Promise<string> {
    const key = await subtle.exportKey("spki", publicKey);
    const digest = await subtle.digest("SHA-256", key);

    return `0x${Buffer.from(digest).toString("hex")}`;
  }

  /**
   * Digitally signs a message using a private key.
   * @param message The message to sign.
   * @param privateKey The private key used for signing.
   * @returns Hexadecimal string of the digital signature.
   */
  static async signMessage(
    message: string,
    privateKey: CryptoKey
  ): Promise<string> {
    const enc = new TextEncoder();
    const signature = await subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      enc.encode(message)
    );
    return Buffer.from(signature).toString("hex");
  }

  /**
   * Verifies if a signature matches a message and public key.
   * @param message The original message.
   * @param signatureHex The hexadecimal signature.
   * @param publicKey The corresponding public key.
   * @returns True if valid, false otherwise.
   */
  static async recoverAndVerify(
    message: string,
    signatureHex: string,
    publicKey: CryptoKey
  ): Promise<boolean> {
    const enc = new TextEncoder();
    const signature = Buffer.from(signatureHex, "hex");
    return subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      enc.encode(message)
    );
  }

  /**
   * Encrypts a private key buffer using AES-256-GCM and a PIN-derived key.
   * @param privateKeyBuffer The exported private key (PKCS8 format).
   * @param pin User PIN used to derive the symmetric key.
   * @returns Hexadecimal encrypted string combining IV, tag, and ciphertext.
   */
  static async encryptPrivateKey(
    privateKeyBuffer: Buffer,
    pin: string
  ): Promise<string> {
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
   * Decrypts a previously encrypted private key using the correct PIN.
   * @param encryptedHex Hexadecimal encrypted private key.
   * @param pin The PIN to derive the decryption key.
   * @returns Re-imported CryptoKey for signing operations.
   */
  static async decryptPrivateKey(
    encryptedHex: string,
    pin: string
  ): Promise<CryptoKey> {
    const buf = Buffer.from(encryptedHex, "hex");
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const encrypted = buf.slice(28);
    const key = crypto.createHash("sha256").update(pin).digest();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return subtle.importKey(
      "pkcs8",
      decrypted,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
  }
}
