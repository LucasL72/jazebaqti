// app/api/admin/albums/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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
