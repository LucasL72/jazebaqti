// app/api/admin/albums/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { AuditSeverity } from "@prisma/client";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { createAlbumSchema, validateSchema } from "@/lib/validation-schemas";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "admin-albums",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    throttleAfter: 25,
    throttleDelayMs: 200,
  });
  if (rateLimited) return rateLimited;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();

    // Validate input with Zod
    const validation = validateSchema(createAlbumSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.errors },
        { status: 400 }
      );
    }

    const { title, releaseYear, coverUrl } = validation.data;

    const artist = await prisma.artist.findFirst();
    if (!artist) {
      return NextResponse.json(
        { error: "Aucun artiste trouvé pour rattacher l'album" },
        { status: 400 }
      );
    }

    const album = await prisma.album.create({
      data: {
        title,
        releaseYear: releaseYear || null,
        coverUrl: coverUrl || null,
        artistId: artist.id,
      },
    });

    await logAuditEvent("album.create", {
      actor: session.user,
      severity: AuditSeverity.info,
      message: `Création album ${album.title}`,
      metadata: {
        albumId: album.id,
        title: album.title,
        releaseYear: album.releaseYear,
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
