import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordComplexity } from "@/lib/admin-security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { createUserSession } from "@/lib/user-session";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "user-register",
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const body = await req.json();
  const { email, password, name } = body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email et mot de passe sont obligatoires" },
      { status: 400 }
    );
  }

  if (!validatePasswordComplexity(password)) {
    return NextResponse.json(
      { error: "Mot de passe trop faible : 12+ caractères avec complexité" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = typeof name === "string" ? name.trim() : null;

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: displayName,
      passwordHash,
      role: Role.viewer,
    },
  });

  await createUserSession(user.id, user.role);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
