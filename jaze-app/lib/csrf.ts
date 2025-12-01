import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const CSRF_COOKIE_NAME = "csrf_token";

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return new Map<string, string>();
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((map, pair) => {
      const [name, ...rest] = pair.split("=");
      if (!name || rest.length === 0) return map;
      map.set(name, rest.join("="));
      return map;
    }, new Map<string, string>());
}

export function issueCsrfToken() {
  const jar = cookies();
  const existing = jar.get(CSRF_COOKIE_NAME)?.value;
  const token = existing || crypto.randomBytes(32).toString("hex");

  jar.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return token;
}

export function validateCsrfRequest(req: Request) {
  const headerToken = req.headers.get("x-csrf-token");
  const cookieToken = parseCookies(req.headers.get("cookie")).get(
    CSRF_COOKIE_NAME
  );

  if (!headerToken || !cookieToken) return false;

  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (headerBuffer.length !== cookieBuffer.length) return false;

  try {
    return crypto.timingSafeEqual(headerBuffer, cookieBuffer);
  } catch (err) {
    console.error("Erreur validation CSRF", err);
    return false;
  }
}

export function rejectIfInvalidCsrf(req: Request) {
  if (!validateCsrfRequest(req)) {
    return NextResponse.json(
      { error: "CSRF token invalide ou manquant" },
      { status: 403 }
    );
  }
  return null;
}
