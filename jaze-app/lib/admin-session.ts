import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "./prisma";
import { getSessionMaxAgeSeconds } from "./admin-security";
import { Role, Session, User } from "@prisma/client";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "admin_session_token";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type SessionCookiePayload = {
  token: string;
  role: Role;
};

const ROLE_VALUES: Role[] = [Role.admin, Role.editor, Role.viewer];

function isRole(value: string | undefined): value is Role {
  return ROLE_VALUES.includes(value as Role);
}

function parseSessionCookie(raw: string | undefined): SessionCookiePayload | null {
  if (!raw) return null;

  const [role, token] = raw.split(":");
  if (!token || !isRole(role)) return null;

  return { token, role };
}

function serializeSessionCookie(token: string, role: Role) {
  return `${role}:${token}`;
}

export type AdminSession = (Session & { user: User }) | null;

export async function createAdminSession(userId: string, role: Role) {
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(token);
  const expires = new Date(Date.now() + getSessionMaxAgeSeconds() * 1000);

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.session.create({
    data: {
      userId,
      sessionToken: hashed,
      expires,
      role,
    },
  });

  const cookieStore = cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, serializeSessionCookie(token, role), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

async function findSessionByToken(rawToken: string | undefined) {
  const payload = parseSessionCookie(rawToken);
  if (!payload) return null;

  const hashed = hashToken(payload.token);

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashed },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expires.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { sessionToken: hashed } }).catch(() => {});
    return null;
  }

  if (
    !session.user ||
    session.role !== payload.role ||
    session.user.role !== payload.role
  ) {
    return null;
  }

  return session;
}

export async function getCurrentAdminSession(): Promise<AdminSession> {
  const cookieStore = cookies();
  const rawCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await findSessionByToken(rawCookie);

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
  if (!session || session.role !== Role.admin || session.user.role !== Role.admin) {
    return NextResponse.json(
      { error: "Authentification administrateur requise" },
      { status: 401 }
    );
  }

  return session;
}

export async function revokeCurrentSession() {
  const cookieStore = cookies();
  const payload = parseSessionCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (payload?.token) {
    const hashed = hashToken(payload.token);
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
  if (!session || session.role !== Role.admin || session.user.role !== Role.admin) {
    const target = callbackUrl
      ? `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/admin/login";
    redirect(target);
  }

  return session;
}
