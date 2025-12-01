import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";

export async function GET() {
  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.userId },
    select: { albumId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(req: Request) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const { albumId, action } = await req.json();
  if (typeof albumId !== "number" || (action !== "add" && action !== "remove")) {
    return NextResponse.json(
      { error: "Données invalides" },
      { status: 400 }
    );
  }

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) {
    return NextResponse.json({ error: "Album introuvable" }, { status: 404 });
  }

  if (action === "add") {
    await prisma.favorite.upsert({
      where: { userId_albumId: { userId: session.userId, albumId } },
      update: {},
      create: { userId: session.userId, albumId },
    });
    return NextResponse.json({ status: "added" });
  }

  await prisma.favorite.deleteMany({
    where: { userId: session.userId, albumId },
  });
  return NextResponse.json({ status: "removed" });
}
