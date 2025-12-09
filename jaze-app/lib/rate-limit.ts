import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  throttleAfter?: number;
  throttleDelayMs?: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

// In-memory store with automatic cleanup
const rateLimitBuckets = new Map<string, RateLimitState>();
const CLEANUP_INTERVAL_MS = 60000; // Clean up every minute
let lastCleanup = Date.now();

function cleanupExpiredBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, state] of rateLimitBuckets) {
    if (state.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

// Validate IP address format to prevent header spoofing
function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Pattern.test(ip)) {
    // Validate each octet is 0-255
    return ip.split(".").every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Pattern.test(ip);
}

function getClientIdentifier(req: Request | NextRequest) {
  // Only trust proxy headers if TRUST_PROXY is enabled
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (trustProxy) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const [first] = forwardedFor.split(",");
      const ip = first?.trim();
      if (ip && isValidIp(ip)) return ip;
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp && isValidIp(realIp)) return realIp;
  }

  // Fallback: use a hash of user-agent + accept-language for some differentiation
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";
  return `anon:${hashString(ua + lang)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function buildHeaders(
  state: RateLimitState,
  options: RateLimitOptions,
  now: number
) {
  const remaining = Math.max(options.limit - state.count, 0);
  const resetSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));

  const headers = new Headers();
  headers.set("RateLimit-Limit", options.limit.toString());
  headers.set("RateLimit-Remaining", remaining.toString());
  headers.set("RateLimit-Reset", resetSeconds.toString());

  return headers;
}

export async function enforceRateLimit(
  req: Request | NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  // Periodic cleanup of expired buckets
  cleanupExpiredBuckets();

  const identifier = getClientIdentifier(req);
  const bucketKey = `${options.key}:${identifier}`;
  const now = Date.now();

  const existing = rateLimitBuckets.get(bucketKey);
  const isExpired = !existing || existing.resetAt <= now;
  const state: RateLimitState = isExpired
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  if (state.count >= options.limit) {
    const headers = buildHeaders(state, options, now);
    headers.set(
      "Retry-After",
      Math.max(1, Math.ceil((state.resetAt - now) / 1000)).toString()
    );

    return NextResponse.json(
      { error: "Trop de requêtes, veuillez réessayer plus tard." },
      { status: 429, headers }
    );
  }

  state.count += 1;
  rateLimitBuckets.set(bucketKey, state);

  if (
    options.throttleAfter !== undefined &&
    options.throttleDelayMs &&
    state.count > options.throttleAfter
  ) {
    await new Promise((resolve) => setTimeout(resolve, options.throttleDelayMs));
  }

  return null;
}
