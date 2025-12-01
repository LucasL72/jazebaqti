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

const rateLimitBuckets = new Map<string, RateLimitState>();

function getClientIdentifier(req: Request | NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first) return first.trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "anonymous";
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
