import crypto from "crypto";
import { env } from "./env";

export const ADMIN_PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{12,}$/;

export function getSessionMaxAgeSeconds() {
  return env.ADMIN_SESSION_MAX_AGE_SECONDS;
}

export function validatePasswordComplexity(password: string) {
  return ADMIN_PASSWORD_POLICY.test(password);
}

export function getPasswordMaxAgeDays() {
  return env.ADMIN_PASSWORD_MAX_AGE_DAYS;
}

export function isPasswordExpired(passwordUpdatedAt: Date) {
  const maxAgeDays = getPasswordMaxAgeDays();
  if (!maxAgeDays || maxAgeDays <= 0) return false;

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - passwordUpdatedAt.getTime() > maxAgeMs;
}

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const derivedKey = await scryptAsync(password, salt);

  if (expected.length !== derivedKey.length) return false;

  return crypto.timingSafeEqual(expected, derivedKey);
}

function generateTotp(secretHex: string, counter: number) {
  const key = Buffer.from(secretHex, "hex");
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return code.toString().padStart(6, "0");
}

export function verifyTotpToken(token: string, secretHex: string, window = 1) {
  if (!token || !secretHex) return false;
  const sanitized = token.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(sanitized)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  try {
    for (let offset = -window; offset <= window; offset += 1) {
      const candidate = generateTotp(secretHex, currentStep + offset);
      if (candidate === sanitized) {
        return true;
      }
    }
  } catch (err) {
    console.error("Erreur de vérification TOTP", err);
    return false;
  }

  return false;
}

export const ADMIN_PASSWORD_POLICY_MESSAGE =
  "12+ caractères, avec majuscules, minuscules, chiffres et caractères spéciaux";
