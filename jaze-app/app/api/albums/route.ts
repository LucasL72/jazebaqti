import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      include: {
        artist: true,
        tracks: true,
      },
      orderBy: {
        releaseYear: "desc",
      },
    });

    return NextResponse.json(albums);
  } catch (error) {
    console.error("[GET /api/albums] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des albums" },
      { status: 500 }
    );
  }
}
