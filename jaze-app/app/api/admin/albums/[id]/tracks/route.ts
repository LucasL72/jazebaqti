// app/api/admin/albums/[id]/tracks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { createTrackSchema, validateSchema } from "@/lib/validation-schemas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  // 👉 On attend le Promise pour récupérer l'id
  const { id: rawId } = await context.params;
  const albumId = Number(rawId);

  if (!rawId || Number.isNaN(albumId)) {
    return NextResponse.json({ error: "ID album invalide" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Validate input with Zod
    const validation = validateSchema(createTrackSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.errors },
        { status: 400 }
      );
    }

    const { title, trackNumber, durationSeconds, audioUrl, isExplicit } = validation.data;

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
        trackNumber: trackNumber || 1,
        durationSeconds: durationSeconds || null,
        audioUrl,
        isExplicit: isExplicit || false,
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
