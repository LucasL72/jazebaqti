import "dotenv/config";

type BooleanString = string | undefined;

type DatabaseTlsOptions = {
  requireTls: boolean;
  caPath?: string;
  certPath?: string;
  keyPath?: string;
};

function parseBoolean(value: BooleanString, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return !["false", "0", "no", "off"].includes(normalized);
}

function parsePositiveNumber(value: string | undefined, defaultValue: number) {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `La variable d'environnement attendue doit être un nombre positif (reçu: ${value}).`
    );
  }
  return parsed;
}

function requireSecret(name: string, minLength = 1) {
  const value = process.env[name];
  if (!value || value.trim().length < minLength) {
    throw new Error(
      `La variable d'environnement ${name} est obligatoire et doit contenir au moins ${minLength} caractères.`
    );
  }
  return value.trim();
}

function requireHexSecret(name: string, minLength = 1) {
  const value = requireSecret(name, minLength);
  if (!/^([0-9a-f]{2})+$/i.test(value)) {
    throw new Error(
      `${name} doit être une chaîne hexadécimale (octets concaténés) pour la génération/validation TOTP.`
    );
  }
  return value;
}

function optionalUrl(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`La variable ${name} doit être une URL valide.`);
  }
}

function requireMysqlUrl() {
  const url = requireSecret("DATABASE_URL", 10);
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("mysql")) {
      throw new Error("DATABASE_URL doit utiliser le schéma mysql://");
    }
    return url;
  } catch {
    throw new Error("DATABASE_URL doit être une URL de connexion MySQL valide.");
  }
}

export function buildDatabaseUrlWithTls(
  baseUrl: string,
  options: DatabaseTlsOptions
) {
  const parsed = new URL(baseUrl);
  if (options.requireTls) {
    parsed.searchParams.set("sslaccept", "strict");
    if (options.caPath) parsed.searchParams.set("sslca", options.caPath);
    if (options.certPath) parsed.searchParams.set("sslcert", options.certPath);
    if (options.keyPath) parsed.searchParams.set("sslkey", options.keyPath);
  }
  return parsed.toString();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: requireMysqlUrl(),
  DATABASE_TLS_REQUIRED: parseBoolean(process.env.DATABASE_TLS_REQUIRED, true),
  DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
  DATABASE_SSL_CERT: process.env.DATABASE_SSL_CERT,
  DATABASE_SSL_KEY: process.env.DATABASE_SSL_KEY,
  ADMIN_EMAIL: requireSecret("ADMIN_EMAIL", 5),
  ADMIN_PASSWORD: requireSecret("ADMIN_PASSWORD", 12),
  ADMIN_TOTP_SECRET: requireHexSecret("ADMIN_TOTP_SECRET", 16),
  MEDIA_SIGNING_SECRET: requireSecret("MEDIA_SIGNING_SECRET", 32),
  ADMIN_SESSION_MAX_AGE_SECONDS: parsePositiveNumber(
    process.env.ADMIN_SESSION_MAX_AGE_SECONDS,
    60 * 30
  ),
  ADMIN_PASSWORD_MAX_AGE_DAYS: parsePositiveNumber(
    process.env.ADMIN_PASSWORD_MAX_AGE_DAYS,
    90
  ),
  SLACK_WEBHOOK_URL: optionalUrl("SLACK_WEBHOOK_URL"),
  AUDIT_ALERT_EMAILS: process.env.AUDIT_ALERT_EMAILS,
  AUDIT_EMAIL_WEBHOOK_URL: optionalUrl("AUDIT_EMAIL_WEBHOOK_URL"),
};

export const databaseUrlWithTls = buildDatabaseUrlWithTls(env.DATABASE_URL, {
  requireTls: env.DATABASE_TLS_REQUIRED,
  caPath: env.DATABASE_SSL_CA,
  certPath: env.DATABASE_SSL_CERT,
  keyPath: env.DATABASE_SSL_KEY,
});

export type AppEnv = typeof env;
