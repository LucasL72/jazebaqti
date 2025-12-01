import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "./prisma";
import { getSessionMaxAgeSeconds } from "./admin-security";
import { Session, User } from "@prisma/client";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "admin_session_token";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type AdminSession = (Session & { user: User }) | null;

export async function createAdminSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(token);
  const expires = new Date(Date.now() + getSessionMaxAgeSeconds() * 1000);

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.session.create({
    data: {
      userId,
      sessionToken: hashed,
      expires,
    },
  });

  const cookieStore = cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

async function findSessionByToken(rawToken: string | undefined) {
  if (!rawToken) return null;
  const hashed = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashed },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expires.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { sessionToken: hashed } }).catch(() => {});
    return null;
  }

  if (!session.user || session.user.role !== "admin") {
    return null;
  }

  return session;
}

export async function getCurrentAdminSession(): Promise<AdminSession> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await findSessionByToken(token);

  if (!session) {
    cookieStore.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return session;
}

export async function requireAdminSession(): Promise<AdminSession | NextResponse> {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentification administrateur requise" },
      { status: 401 }
    );
  }

  return session;
}

export async function revokeCurrentSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const hashed = hashToken(token);
    await prisma.session.deleteMany({ where: { sessionToken: hashed } });
  }

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function enforceAdminPageAccess(callbackUrl?: string) {
  const session = await getCurrentAdminSession();
  if (!session) {
    const target = callbackUrl
      ? `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/admin/login";
    redirect(target);
  }

  return session;
}
