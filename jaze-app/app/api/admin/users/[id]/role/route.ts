import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { AuditSeverity, Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

type Params = {
  params: { id: string };
};

function isRole(value: string): value is Role {
  return value === Role.admin || value === Role.editor || value === Role.viewer;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { role } = await req.json();

  if (typeof role !== "string" || !isRole(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  const targetId = params.id;

  try {
    const existing = await prisma.user.findUnique({ where: { id: targetId } });

    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role },
    });

    const severity =
      role === Role.admin && existing.role !== Role.admin
        ? AuditSeverity.critical
        : AuditSeverity.warning;

    await logAuditEvent("role.change", {
      actor: session.user,
      severity,
      message: `Rôle modifié pour ${existing.email || existing.id}`,
      metadata: {
        userId: existing.id,
        previousRole: existing.role,
        newRole: updated.role,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rôle" },
      { status: 500 }
    );
  }
}
