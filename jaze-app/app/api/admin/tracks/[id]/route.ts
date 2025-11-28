// app/api/admin/tracks/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { unlink } from "fs/promises";

function isLocalMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("/audio/albums/") || url.startsWith("/images/albums/");
}

async function deleteLocalFileIfExists(url: string | null | undefined) {
  if (!isLocalMediaUrl(url)) return;
  const relative = url.replace(/^\//, ""); // enlève le premier "/"
  const fsPath = path.join(process.cwd(), "public", relative);

  try {
    await unlink(fsPath);
  } catch (err: any) {
    // Si le fichier n'existe pas, on ignore
    if (err && err.code !== "ENOENT") {
      console.error("Erreur lors de la suppression du fichier:", fsPath, err);
    }
  }
}

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(req: Request, { params }: Params) {
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
      await deleteLocalFileIfExists(existing.audioUrl);
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

export async function DELETE(_: Request, { params }: Params) {
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
    await deleteLocalFileIfExists(existing.audioUrl);

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
