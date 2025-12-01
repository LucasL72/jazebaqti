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
import { Role, AuditSeverity } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";

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
    await logAuditEvent("auth.login.failure", {
      actorEmailOverride: typeof email === "string" ? email : null,
      severity: AuditSeverity.warning,
      message: "Champs manquants ou invalides",
    });
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
    await logAuditEvent("auth.login.failure", {
      actorEmailOverride: normalizedEmail,
      severity: AuditSeverity.warning,
      message: "Utilisateur inexistant ou non admin",
    });
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  if (isPasswordExpired(user.passwordUpdatedAt)) {
    await prisma.session.deleteMany({ where: { userId: user.id } });

    await logAuditEvent("auth.login.failure", {
      actor: user,
      severity: AuditSeverity.warning,
      message: "Mot de passe expiré",
    });

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
    await logAuditEvent("auth.login.failure", {
      actor: user,
      severity: AuditSeverity.warning,
      message: "Mot de passe incorrect",
    });
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  const totpOk = verifyTotpToken(totp.trim(), user.totpSecret);
  if (!totpOk) {
    await logAuditEvent("auth.login.failure", {
      actor: user,
      severity: AuditSeverity.warning,
      message: "Code TOTP invalide",
    });
    return NextResponse.json(
      { error: "Code de second facteur invalide" },
      { status: 401 }
    );
  }

  await createAdminSession(user.id, user.role);

  await logAuditEvent("auth.login.success", {
    actor: user,
    severity: AuditSeverity.info,
    message: "Connexion admin réussie",
  });

  return NextResponse.json({ ok: true });
}
