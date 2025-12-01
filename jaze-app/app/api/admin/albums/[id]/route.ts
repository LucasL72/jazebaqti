// app/api/admin/albums/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { unlink } from "fs/promises";
import { requireAdminSession } from "@/lib/admin-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// Helpers pour gérer les fichiers locaux
function isLocalMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("/audio/albums/") || url.startsWith("/images/albums/");
}

async function deleteLocalFileIfExists(url: string | null | undefined) {
  if (!isLocalMediaUrl(url)) return;
  const relative = url.replace(/^\//, ""); // enlève le "/" de début
  const fsPath = path.join(process.cwd(), "public", relative);

  try {
    await unlink(fsPath);
  } catch (err: unknown) {
    type WithCode = { code?: string };
    const code =
      typeof err === "object" && err && "code" in err
        ? (err as WithCode).code
        : null;
    if (code !== "ENOENT") {
      console.error("Erreur lors de la suppression du fichier:", fsPath, err);
    }
  }
}

// ---------- GET : un album + ses pistes ----------
export async function GET(_req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    const album = await prisma.album.findUnique({
      where: { id },
      include: { tracks: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album introuvable" }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'album" },
      { status: 500 }
    );
  }
}

// ---------- PATCH : update titre / année / cover ----------
export async function PATCH(req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, releaseYear, coverUrl } = body;

    const existing = await prisma.album.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Album introuvable" }, { status: 404 });
    }

    const year =
      typeof releaseYear === "number"
        ? releaseYear
        : releaseYear
        ? Number(releaseYear)
        : null;

    const updated = await prisma.album.update({
      where: { id },
      data: {
        title,
        releaseYear: Number.isNaN(year) ? null : year,
        coverUrl: coverUrl ?? null,
      },
    });

    // si la cover a changé et que l’ancienne était locale -> on supprime l'ancien fichier
    if (existing.coverUrl && existing.coverUrl !== updated.coverUrl) {
      await deleteLocalFileIfExists(existing.coverUrl);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'album" },
      { status: 500 }
    );
  }
}

// ---------- DELETE : supprimer album + pistes + fichiers ----------
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    const album = await prisma.album.findUnique({
      where: { id },
      include: { tracks: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album introuvable" }, { status: 404 });
    }

    // 1) supprimer les fichiers audio locaux des pistes
    for (const track of album.tracks) {
      await deleteLocalFileIfExists(track.audioUrl);
    }

    // 2) supprimer la cover locale si besoin
    await deleteLocalFileIfExists(album.coverUrl);

    // 3) supprimer les données en base
    await prisma.track.deleteMany({ where: { albumId: id } });
    await prisma.album.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'album" },
      { status: 500 }
    );
  }
}
