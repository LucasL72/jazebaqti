// app/api/admin/albums/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "admin-albums",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    throttleAfter: 25,
    throttleDelayMs: 200,
  });
  if (rateLimited) return rateLimited;

  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const { title, releaseYear, coverUrl } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est obligatoire" },
        { status: 400 }
      );
    }

    const artist = await prisma.artist.findFirst();
    if (!artist) {
      return NextResponse.json(
        { error: "Aucun artiste trouvé pour rattacher l'album" },
        { status: 400 }
      );
    }

    const year =
      typeof releaseYear === "number"
        ? releaseYear
        : releaseYear
        ? Number(releaseYear)
        : null;

    const album = await prisma.album.create({
      data: {
        title,
        releaseYear: Number.isNaN(year) ? null : year,
        coverUrl: coverUrl || null,
        artistId: artist.id,
      },
    });

    return NextResponse.json(album, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'album" },
      { status: 500 }
    );
  }
}
