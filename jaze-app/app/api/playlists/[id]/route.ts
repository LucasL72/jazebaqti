import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { renamePlaylistSchema, validateSchema } from "@/lib/validation-schemas";

type Context = { params: Promise<{ id: string }> };

// Détail d'une playlist avec ses pistes ordonnées (pour la lecture).
export async function GET(_req: Request, context: Context) {
  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  const playlist = await prisma.playlist.findFirst({
    where: { id, userId: session.userId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          track: {
            include: { album: { select: { title: true, coverUrl: true } } },
          },
        },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      tracks: playlist.items.map((item) => ({
        id: item.track.id,
        title: item.track.title,
        trackNumber: item.track.trackNumber,
        durationSeconds: item.track.durationSeconds,
        audioUrl: item.track.audioUrl,
        albumTitle: item.track.album.title,
        albumCoverUrl: item.track.album.coverUrl,
        position: item.position,
      })),
    },
  });
}

// Renomme une playlist.
export async function PATCH(req: Request, context: Context) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const result = validateSchema(renamePlaylistSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.errors.join(", ") }, { status: 400 });
  }

  const updated = await prisma.playlist.updateMany({
    where: { id, userId: session.userId },
    data: { name: result.data.name },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  return NextResponse.json({ status: "renamed", name: result.data.name });
}

// Supprime une playlist (les items partent en cascade).
export async function DELETE(req: Request, context: Context) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  const deleted = await prisma.playlist.deleteMany({
    where: { id, userId: session.userId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  return NextResponse.json({ status: "deleted" });
}
