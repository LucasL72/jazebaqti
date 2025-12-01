import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { validatePasswordComplexity, verifyPassword } from "@/lib/admin-security";
import { createUserSession } from "@/lib/user-session";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "user-login",
    limit: 15,
    windowMs: 60_000,
    throttleAfter: 8,
    throttleDelayMs: 500,
  });
  if (rateLimited) return rateLimited;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const { email, password } = await req.json();

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
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Identifiants invalides" },
      { status: 401 }
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { error: "Identifiants invalides" },
      { status: 401 }
    );
  }

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
