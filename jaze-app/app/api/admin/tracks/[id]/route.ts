// app/api/admin/tracks/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMediaAtUrl } from "@/lib/media-storage";
import { requireAdminSession } from "@/lib/admin-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "ID piste invalide" }, { status: 400 });
  }

  try {
    const existing = await prisma.track.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Piste introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const { title, trackNumber, durationSeconds, audioUrl, isExplicit } = body;

    const updated = await prisma.track.update({
      where: { id },
      data: {
        title,
        trackNumber:
          trackNumber !== undefined ? Number(trackNumber) : undefined,
        durationSeconds:
          durationSeconds !== undefined ? Number(durationSeconds) : undefined,
        audioUrl,
        isExplicit,
      },
    });

    // Si l'URL audio a changé et que l'ancienne était locale -> on supprime l'ancien fichier
    if (existing.audioUrl && existing.audioUrl !== updated.audioUrl) {
      await deleteMediaAtUrl(existing.audioUrl);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la piste" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "ID piste invalide" }, { status: 400 });
  }

  try {
    const existing = await prisma.track.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Piste introuvable" }, { status: 404 });
    }

    // Suppression du fichier audio si local
    await deleteMediaAtUrl(existing.audioUrl);

    await prisma.track.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la piste" },
      { status: 500 }
    );
  }
}
