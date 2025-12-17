import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  validatePasswordComplexity,
  verifyPassword,
} from "@/lib/admin-security";
import { sanitizeTextInput } from "@/lib/sanitizers";

export async function GET() {
  const sessionOrError = await requireUserSession();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const user = sessionOrError.user;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}

export async function PUT(req: Request) {
  const csrfError = rejectIfInvalidCsrf(req);
  if (csrfError) return csrfError;

  const sessionOrError = await requireUserSession();
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
    name?: string | null;
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

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
  });
}
