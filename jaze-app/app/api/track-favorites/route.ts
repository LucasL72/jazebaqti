import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";

// Liste des pistes likées par l'utilisateur connecté.
export async function GET() {
  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const favorites = await prisma.trackFavorite.findMany({
    where: { userId: session.userId },
    select: { trackId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

// Ajoute / retire un « J'aime » sur une piste.
export async function POST(req: Request) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { trackId, action } = await req.json().catch(() => ({}));
  if (typeof trackId !== "number" || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    return NextResponse.json({ error: "Piste introuvable" }, { status: 404 });
  }

  if (action === "add") {
    await prisma.trackFavorite.upsert({
      where: { userId_trackId: { userId: session.userId, trackId } },
      update: {},
      create: { userId: session.userId, trackId },
    });
    return NextResponse.json({ status: "added" });
  }

  await prisma.trackFavorite.deleteMany({
    where: { userId: session.userId, trackId },
  });
  return NextResponse.json({ status: "removed" });
}
