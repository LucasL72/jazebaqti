import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ On attend la promesse
  const { id } = await context.params;

  const albumId = Number(id);

  if (isNaN(albumId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artist: true,
        tracks: true,
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album non trouvé" }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (err) {
    console.error("[GET /api/albums/:id] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
