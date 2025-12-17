import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Role, Session, User } from "@prisma/client";
import { prisma } from "./prisma";
import { getSessionMaxAgeSeconds } from "./admin-security";
import { cleanupExpiredSessions } from "./session-cleanup";

const USER_SESSION_COOKIE = "user_session_token";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function serializeSessionCookie(token: string, role: Role) {
  return `${role}:${token}`;
}

function parseSessionCookie(raw: string | undefined) {
  if (!raw) return null;
  const [role, token] = raw.split(":");
  if (!token) return null;
  if (!Object.values(Role).includes(role as Role)) return null;
  return { role: role as Role, token };
}

export type UserSession = (Session & { user: User }) | null;

export async function createUserSession(userId: string, role: Role) {
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

  const jar = await cookies();
  jar.set(USER_SESSION_COOKIE, serializeSessionCookie(token, role), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

async function findSession(raw: string | undefined): Promise<UserSession> {
  const parsed = parseSessionCookie(raw);
  if (!parsed) return null;

  const hashed = hashToken(parsed.token);
  const session = await prisma.session.findUnique({
    where: { sessionToken: hashed },
    include: { user: true },
  });

  if (!session || !session.user) return null;
  if (session.expires.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { sessionToken: hashed } }).catch(() => {});
    return null;
  }

  if (session.user.role !== parsed.role || session.role !== parsed.role) {
    return null;
  }

  return session;
}

export async function getCurrentUserSession(): Promise<UserSession> {
  // Opportunistic cleanup of expired sessions
  cleanupExpiredSessions().catch(() => {});

  const jar = await cookies();
  const raw = jar.get(USER_SESSION_COOKIE)?.value;
  const session = await findSession(raw);

  // Note: Ne pas modifier les cookies ici car cette fonction peut être appelée
  // depuis un Server Component. La suppression du cookie sera gérée côté client
  // ou dans les Route Handlers.

  return session;
}

export async function requireUserSession(): Promise<UserSession | NextResponse> {
  const session = await getCurrentUserSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  return session;
}

export async function revokeUserSession() {
  const jar = await cookies();
  const raw = jar.get(USER_SESSION_COOKIE)?.value;
  const parsed = parseSessionCookie(raw);

  if (parsed?.token) {
    const hashed = hashToken(parsed.token);
    await prisma.session.deleteMany({ where: { sessionToken: hashed } });
  }

  jar.set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
