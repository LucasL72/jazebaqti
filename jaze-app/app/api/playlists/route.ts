import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/user-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { createPlaylistSchema, validateSchema } from "@/lib/validation-schemas";

// Liste les playlists de l'utilisateur (avec le nombre de pistes).
export async function GET() {
  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const playlists = await prisma.playlist.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json({
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      trackCount: p._count.items,
    })),
  });
}

// Crée une nouvelle playlist.
export async function POST(req: Request) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireUserSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const result = validateSchema(createPlaylistSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.errors.join(", ") }, { status: 400 });
  }

  const playlist = await prisma.playlist.create({
    data: { userId: session.userId, name: result.data.name },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ playlist: { ...playlist, trackCount: 0 } }, { status: 201 });
}
