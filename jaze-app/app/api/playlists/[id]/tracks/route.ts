import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import {
  addPlaylistTrackSchema,
  reorderPlaylistSchema,
  validateSchema,
} from "@/lib/validation-schemas";

type Context = { params: Promise<{ id: string }> };

async function getOwnedPlaylist(id: string, userId: string) {
  return prisma.playlist.findFirst({ where: { id, userId }, select: { id: true } });
}

// Ajoute une piste à la fin de la playlist.
export async function POST(req: Request, context: Context) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const result = validateSchema(addPlaylistTrackSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.errors.join(", ") }, { status: 400 });
  }

  const playlist = await getOwnedPlaylist(id, session.userId);
  if (!playlist) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  const track = await prisma.track.findUnique({ where: { id: result.data.trackId } });
  if (!track) {
    return NextResponse.json({ error: "Piste introuvable" }, { status: 404 });
  }

  const existing = await prisma.playlistItem.findUnique({
    where: { playlistId_trackId: { playlistId: id, trackId: result.data.trackId } },
  });
  if (existing) {
    return NextResponse.json({ status: "exists" });
  }

  const last = await prisma.playlistItem.findFirst({
    where: { playlistId: id },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;

  await prisma.playlistItem.create({
    data: { playlistId: id, trackId: result.data.trackId, position },
  });
  await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ status: "added" }, { status: 201 });
}

// Réordonne les pistes de la playlist (nouvel ordre fourni).
export async function PATCH(req: Request, context: Context) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const result = validateSchema(reorderPlaylistSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.errors.join(", ") }, { status: 400 });
  }

  const playlist = await getOwnedPlaylist(id, session.userId);
  if (!playlist) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  // Réaffecte les positions selon l'ordre fourni, en ignorant les ids inconnus.
  await prisma.$transaction(
    result.data.trackIds.map((trackId, index) =>
      prisma.playlistItem.updateMany({
        where: { playlistId: id, trackId },
        data: { position: index },
      })
    )
  );
  await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ status: "reordered" });
}

// Retire une piste de la playlist.
export async function DELETE(req: Request, context: Context) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const url = new URL(req.url);
  const trackId = Number(url.searchParams.get("trackId"));
  if (!Number.isInteger(trackId) || trackId <= 0) {
    return NextResponse.json({ error: "Piste invalide" }, { status: 400 });
  }

  const playlist = await getOwnedPlaylist(id, session.userId);
  if (!playlist) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  await prisma.playlistItem.deleteMany({ where: { playlistId: id, trackId } });
  await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ status: "removed" });
}
