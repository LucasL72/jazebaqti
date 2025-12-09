import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const ids = idsParam
      ?.split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id));

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const skip = (page - 1) * limit;

    const where = ids && ids.length > 0 ? { id: { in: ids } } : undefined;

    // If specific IDs requested, return without pagination
    if (ids && ids.length > 0) {
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
      return NextResponse.json({ albums });
    }

    // Get total count and paginated albums in parallel
    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        include: {
          artist: true,
          tracks: true,
        },
        orderBy: {
          releaseYear: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      albums,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[GET /api/albums] error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Erreur lors de la récupération des albums" },
      { status: 500 }
    );
  }
}
