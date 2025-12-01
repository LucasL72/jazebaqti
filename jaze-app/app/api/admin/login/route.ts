// app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_PASSWORD_POLICY_MESSAGE,
  isPasswordExpired,
  validatePasswordComplexity,
  verifyPassword,
  verifyTotpToken,
} from "@/lib/admin-security";
import { createAdminSession } from "@/lib/admin-session";
import { Role } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "admin-login",
    limit: 5,
    windowMs: 60_000,
    throttleAfter: 3,
    throttleDelayMs: 400,
  });
  if (rateLimited) return rateLimited;

  const { email, password, totp } = await req.json();

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof totp !== "string"
  ) {
    return NextResponse.json(
      { error: "Email, mot de passe et code 2FA sont obligatoires" },
      { status: 400 }
    );
  }

  if (!validatePasswordComplexity(password)) {
    return NextResponse.json(
      { error: `Mot de passe non conforme (${ADMIN_PASSWORD_POLICY_MESSAGE})` },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.role !== Role.admin || !user.passwordHash || !user.totpSecret) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  if (isPasswordExpired(user.passwordUpdatedAt)) {
    await prisma.session.deleteMany({ where: { userId: user.id } });

    return NextResponse.json(
      {
        error:
          "Mot de passe expiré : rotation obligatoire avant une nouvelle connexion.",
      },
      { status: 403 }
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  const totpOk = verifyTotpToken(totp.trim(), user.totpSecret);
  if (!totpOk) {
    return NextResponse.json(
      { error: "Code de second facteur invalide" },
      { status: 401 }
    );
  }

  await createAdminSession(user.id, user.role);

  return NextResponse.json({ ok: true });
}
