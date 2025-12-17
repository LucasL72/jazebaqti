import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  validatePasswordComplexity,
  verifyPassword,
} from "@/lib/admin-security";
import { logAuditEvent } from "@/lib/audit-log";
import { sanitizeTextInput } from "@/lib/sanitizers";

export async function GET() {
  const sessionOrError = await requireAdminSession();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const user = sessionOrError.user;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    passwordUpdatedAt: user.passwordUpdatedAt,
  });
}

export async function PUT(req: Request) {
  const csrfError = rejectIfInvalidCsrf(req);
  if (csrfError) return csrfError;

  const sessionOrError = await requireAdminSession();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const user = sessionOrError.user;

  let body: {
    email?: string;
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const updates: {
    email?: string;
    name?: string;
    passwordHash?: string;
    passwordUpdatedAt?: Date;
  } = {};

  // Update email
  if (body.email && body.email !== user.email) {
    const sanitizedEmail = sanitizeTextInput(body.email).toLowerCase();

    if (!sanitizedEmail || !sanitizedEmail.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    updates.email = sanitizedEmail;
  }

  // Update name
  if (body.name !== undefined) {
    updates.name = sanitizeTextInput(body.name) || null;
  }

  // Update password
  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json(
        { error: "Mot de passe actuel requis" },
        { status: 400 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Aucun mot de passe défini pour ce compte" },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!isValid) {
      await logAuditEvent({
        action: "admin_password_change_failed",
        message: "Tentative de changement de mot de passe avec ancien mot de passe incorrect",
        severity: "warning",
        actorEmail: user.email || undefined,
        actorUserId: user.id,
      });

      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    if (!validatePasswordComplexity(body.newPassword)) {
      return NextResponse.json(
        {
          error:
            "Le nouveau mot de passe doit contenir 12+ caractères avec majuscules, minuscules, chiffres et caractères spéciaux",
        },
        { status: 400 }
      );
    }

    updates.passwordHash = await hashPassword(body.newPassword);
    updates.passwordUpdatedAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
  });

  const changedFields = Object.keys(updates).filter((k) => k !== "passwordHash");
  if (updates.passwordHash) changedFields.push("password");

  await logAuditEvent({
    action: "admin_profile_updated",
    message: `Profil modifié: ${changedFields.join(", ")}`,
    severity: "info",
    actorEmail: updated.email || user.email || undefined,
    actorUserId: user.id,
  });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    passwordUpdatedAt: updated.passwordUpdatedAt,
  });
}
