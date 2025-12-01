// app/api/admin/albums/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { logAuditEvent } from "@/lib/audit-log";
import { AuditSeverity } from "@prisma/client";
import { deleteMediaAtUrl } from "@/lib/media-storage";
import path from "path";
import { existsSync } from "fs";
import { stat } from "fs/promises";

const LOCAL_WHITELIST = ["/audio/albums/", "/images/albums/"];

function isLocalMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return LOCAL_WHITELIST.some((prefix) => url.startsWith(prefix));
}

async function deleteLegacyLocalFile(url: string | null | undefined) {
  if (!isLocalMediaUrl(url)) return;
  const relative = url.replace(/^\//, "");
  const fsPath = path.join(process.cwd(), "public", relative);

  try {
    const info = existsSync(fsPath) ? await stat(fsPath) : null;
    if (info?.isFile()) {
      await deleteMediaAtUrl(url);
    }
  } catch (err: unknown) {
    console.error("Erreur lors de la suppression du fichier:", fsPath, err);
  }
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
      await deleteMediaAtUrl(existing.coverUrl);
      await deleteLegacyLocalFile(existing.coverUrl);
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
      await deleteMediaAtUrl(track.audioUrl);
      await deleteLegacyLocalFile(track.audioUrl);
    }

    // 2) supprimer la cover locale si besoin
    await deleteMediaAtUrl(album.coverUrl);
    await deleteLegacyLocalFile(album.coverUrl);

    // 3) supprimer les données en base
    await prisma.track.deleteMany({ where: { albumId: id } });
    await prisma.album.delete({ where: { id } });

    await logAuditEvent("album.delete", {
      actor: session.user,
      severity:
        album.tracks.length >= 5 ? AuditSeverity.critical : AuditSeverity.warning,
      message: `Suppression album ${album.title}`,
      metadata: {
        albumId: album.id,
        title: album.title,
        tracksDeleted: album.tracks.length,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'album" },
      { status: 500 }
    );
  }
}
