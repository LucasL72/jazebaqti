// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import { AuditSeverity } from "@prisma/client";
import { validateAndStoreMedia } from "@/lib/media-storage";

export async function POST(req: Request) {
  const rateLimited = await enforceRateLimit(req, {
    key: "admin-upload",
    limit: 25,
    windowMs: 10 * 60 * 1000,
    throttleAfter: 10,
    throttleDelayMs: 500,
  });
  if (rateLimited) return rateLimited;

  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "audio" | "image"
  const albumId = formData.get("albumId") as string | null;

  if (!file || !type) {
    return NextResponse.json(
      { error: "Fichier ou type manquant" },
      { status: 400 }
    );
  }

  if (type !== "audio" && type !== "image") {
    return NextResponse.json(
      { error: "Type d'upload non supporté" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const persisted = await validateAndStoreMedia({
      fileBuffer: buffer,
      fileName: file.name,
      declaredMime: file.type,
      type,
      albumId,
    });

    await logAuditEvent("media.upload", {
      actor: session.user,
      severity: AuditSeverity.info,
      message: `Upload ${type}`,
      metadata: {
        filename: file.name,
        size: file.size,
        type,
        url: persisted.url,
        key: persisted.key,
        mime: persisted.mime,
      },
    });

    return NextResponse.json({ url: persisted.url });
  } catch (err: unknown) {
    console.error("Erreur upload", err);
    const message = err instanceof Error ? err.message : "Erreur upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
