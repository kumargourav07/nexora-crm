import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Derives a 32-byte key from ENCRYPTION_KEY or AUTH_SECRET.
 */
function getMasterKey(): Buffer {
  const masterSecret =
    process.env.ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    "nexora-crm-default-fallback-encryption-key-32-bytes";

  // SHA-256 guarantees exactly 32 bytes for AES-256
  return crypto.createHash("sha256").update(masterSecret).digest();
}

/**
 * Encrypts sensitive credentials (API keys, webhook secrets, tokens) using AES-256-GCM.
 * Output format: base64(iv:authTag:ciphertext)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  const combined = `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  return Buffer.from(combined, "utf8").toString("base64");
}

/**
 * Decrypts AES-256-GCM encrypted credentials.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return "";

  try {
    const raw = Buffer.from(encryptedPayload, "base64").toString("utf8");
    const parts = raw.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted payload format");
    }

    const [ivB64, authTagB64, cipherB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherB64, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Crypto] Failed to decrypt secret:", error);
    throw new Error("Failed to decrypt integration secret");
  }
}

/**
 * Safely masks secrets for UI display (e.g. `••••••••3a8f`).
 */
export function maskSecret(secret: string): string {
  if (!secret) return "Not configured";
  if (secret.length <= 4) return "••••";
  const suffix = secret.slice(-4);
  return `••••••••${suffix}`;
}

/**
 * Timing-safe HMAC SHA-256 verification.
 */
export function verifyHmacSha256(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) return false;

  try {
    const cleanSignature = signature.startsWith("sha256=")
      ? signature.replace("sha256=", "")
      : signature;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    const signatureBuffer = Buffer.from(cleanSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a random cryptographic token (hex).
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
