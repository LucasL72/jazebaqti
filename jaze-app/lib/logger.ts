type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

// Sensitive keys that should be redacted from logs
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "sessionToken",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "creditCard",
  "ssn",
  "totp",
  "otp",
  "pin",
]);

// Patterns to redact in string values
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_]+/gi, // Bearer tokens
  /Basic\s+[A-Za-z0-9+/=]+/gi, // Basic auth
  /password[=:]\s*[^\s&]+/gi, // Password in URLs/strings
];

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    let redacted = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, "[REDACTED]");
    }
    return redacted;
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive words
    const isSensitive = SENSITIVE_KEYS.has(lowerKey) ||
      Array.from(SENSITIVE_KEYS).some((k) => lowerKey.includes(k));

    if (isSensitive) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactValue(value);
    }
  }

  return result;
}

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error", raw: String(error) };
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): string {
  const timestamp = new Date().toISOString();
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message,
  };

  if (context) {
    logEntry.context = redactObject(context);
  }

  if (error) {
    logEntry.error = formatError(error);
  }

  // In production, output JSON for log aggregators
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(logEntry);
  }

  // In development, output readable format
  const parts = [`[${timestamp}] ${level.toUpperCase()}: ${message}`];

  if (context) {
    parts.push(`Context: ${JSON.stringify(redactObject(context), null, 2)}`);
  }

  if (error) {
    parts.push(`Error: ${JSON.stringify(formatError(error), null, 2)}`);
  }

  return parts.join("\n");
}

// Report best-effort des erreurs vers un collecteur externe (Sentry, Datadog,
// webhook…) si ERROR_REPORTING_WEBHOOK_URL est configuré. Volontairement
// découplé de lib/env pour rester utilisable partout (y compris en edge).
function reportError(
  message: string,
  error?: unknown,
  context?: LogContext
): void {
  const endpoint = process.env.ERROR_REPORTING_WEBHOOK_URL;
  if (!endpoint || typeof fetch !== "function") return;

  const payload = {
    timestamp: new Date().toISOString(),
    level: "error" as const,
    message,
    error: error ? formatError(error) : undefined,
    context: context ? redactObject(context) : undefined,
    service: "jaze-app",
    environment: process.env.NODE_ENV,
  };

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog("debug", message, context));
    }
  },

  info(message: string, context?: LogContext) {
    console.info(formatLog("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog("warn", message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(formatLog("error", message, context, error));
    reportError(message, error, context);
  },
};

export default logger;
