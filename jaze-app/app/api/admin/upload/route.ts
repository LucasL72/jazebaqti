// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { requireAdminSession } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";

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

  if (!file || !type) {
    return NextResponse.json(
      { error: "Fichier ou type manquant" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  let baseDir: string;
  if (type === "audio") {
    baseDir = "audio";
  } else if (type === "image") {
    baseDir = "images/albums";
  } else {
    baseDir = "uploads";
  }

  const uploadDir = path.join(process.cwd(), "public", baseDir);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const url = `/${baseDir}/${filename}`;
  return NextResponse.json({ url });
}
