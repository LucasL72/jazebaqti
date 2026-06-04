import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";

const RECENT_LIMIT = 12;

function trackToQueueItem(track: {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
  playCount: number;
  album: { title: string; coverUrl: string | null };
}) {
  return {
    id: track.id,
    title: track.title,
    trackNumber: track.trackNumber,
    durationSeconds: track.durationSeconds,
    audioUrl: track.audioUrl,
    playCount: track.playCount,
    albumTitle: track.album.title,
    albumCoverUrl: track.album.coverUrl,
  };
}

// Historique récent + point de reprise.
export async function GET() {
  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const history = await prisma.playHistory.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    distinct: ["trackId"],
    take: RECENT_LIMIT,
    include: {
      track: { include: { album: { select: { title: true, coverUrl: true } } } },
    },
  });

  const resume = await prisma.playbackProgress.findFirst({
    where: { userId: session.userId, positionSeconds: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    include: {
      track: { include: { album: { select: { title: true, coverUrl: true } } } },
    },
  });

  return NextResponse.json({
    recent: history.map((h) => trackToQueueItem(h.track)),
    resume: resume
      ? {
          positionSeconds: resume.positionSeconds,
          track: trackToQueueItem(resume.track),
        }
      : null,
  });
}

// Enregistre un événement de lecture.
//  - action "play"     : nouvelle écoute (compteur + historique + position)
//  - action "progress" : simple sauvegarde de la position de reprise
export async function POST(req: Request) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { trackId, action, positionSeconds } = await req.json().catch(() => ({}));
  if (typeof trackId !== "number" || (action !== "play" && action !== "progress")) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const position =
    typeof positionSeconds === "number" && positionSeconds >= 0
      ? Math.floor(positionSeconds)
      : 0;

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    return NextResponse.json({ error: "Piste introuvable" }, { status: 404 });
  }

  if (action === "play") {
    await prisma.$transaction([
      prisma.track.update({
        where: { id: trackId },
        data: { playCount: { increment: 1 } },
      }),
      prisma.playHistory.create({ data: { userId: session.userId, trackId } }),
      prisma.playbackProgress.upsert({
        where: { userId_trackId: { userId: session.userId, trackId } },
        update: { positionSeconds: position },
        create: { userId: session.userId, trackId, positionSeconds: position },
      }),
    ]);
    return NextResponse.json({ status: "recorded" });
  }

  await prisma.playbackProgress.upsert({
    where: { userId_trackId: { userId: session.userId, trackId } },
    update: { positionSeconds: position },
    create: { userId: session.userId, trackId, positionSeconds: position },
  });
  return NextResponse.json({ status: "progress" });
}
