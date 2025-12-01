import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const ids = idsParam
      ?.split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id));

    const where = ids && ids.length > 0 ? { id: { in: ids } } : undefined;

    const albums = await prisma.album.findMany({
      where,
      include: {
        artist: true,
        tracks: true,
      },
      orderBy: {
        releaseYear: "desc",
      },
    });

    if (ids && ids.length > 0) {
      return NextResponse.json({ albums });
    }

    return NextResponse.json(albums);
  } catch (error) {
    console.error("[GET /api/albums] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des albums" },
      { status: 500 }
    );
  }
}
