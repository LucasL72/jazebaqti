// app/api/admin/albums/[id]/tracks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  // 👉 On attend le Promise pour récupérer l'id
  const { id: rawId } = await context.params;
  const albumId = Number(rawId);

  if (!rawId || Number.isNaN(albumId)) {
    return NextResponse.json({ error: "ID album invalide" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      title,
      trackNumber,
      durationSeconds,
      audioUrl,
      isExplicit = false,
    } = body;

    if (!title || !audioUrl) {
      return NextResponse.json(
        { error: "Titre et audioUrl sont obligatoires" },
        { status: 400 }
      );
    }

    // Vérifier que l'album existe bien
    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json({ error: "Album introuvable" }, { status: 404 });
    }

    const track = await prisma.track.create({
      data: {
        albumId,
        title,
        trackNumber: trackNumber ? Number(trackNumber) : 1,
        durationSeconds: durationSeconds ? Number(durationSeconds) : null,
        audioUrl,
        isExplicit,
      },
    });

    return NextResponse.json(track, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la création de la piste" },
      { status: 500 }
    );
  }
}
