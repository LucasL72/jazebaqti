import { existsSync, createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { Readable } from "stream";

export type MediaType = "audio" | "image";

const MAX_FILE_SIZES: Record<MediaType, number> = {
  audio: 40 * 1024 * 1024, // 40 MB
  image: 10 * 1024 * 1024, // 10 MB
};

const ALLOWED_BASE_DIRS: Record<MediaType, string> = {
  audio: "audio/albums",
  image: "images/albums",
};

const ALLOWED_MIME_BY_TYPE: Record<MediaType, string[]> = {
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/mp4",
  ],
  image: ["image/webp", "image/png", "image/jpeg"],
};

const ALLOWED_EXTENSIONS: Record<MediaType, string[]> = {
  audio: ["mp3", "wav", "flac", "ogg", "webm", "m4a"],
  image: ["webp", "png", "jpg", "jpeg"],
};

const EXTENSION_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function getSigningSecret() {
  return (
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_TOTP_SECRET ||
    "change-me"
  );
}

function slugify(input: string) {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "media";
}

function detectMimeFromBuffer(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: "image/jpeg", ext: "jpg" } as const;
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" } as const;
  }
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" } as const;
  }
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "fLaC") {
    return { mime: "audio/flac", ext: "flac" } as const;
  }
  if (buffer.length >= 3 && buffer.slice(0, 3).toString("ascii") === "ID3") {
    return { mime: "audio/mpeg", ext: "mp3" } as const;
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0
  ) {
    return { mime: "audio/mpeg", ext: "mp3" } as const;
  }
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WAVE"
  ) {
    return { mime: "audio/wav", ext: "wav" } as const;
  }
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "OggS") {
    return { mime: "audio/ogg", ext: "ogg" } as const;
  }
  if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
    return { mime: "audio/mp4", ext: "m4a" } as const;
  }
  return { mime: null, ext: null } as const;
}

function isExecutablePayload(buffer: Buffer) {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) return true; // MZ (PE)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  )
    return true; // ELF
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) return true; // Shebang
  return false;
}

function normalizeAlbumId(albumId?: string | null) {
  if (!albumId) return "unassigned";
  const trimmed = albumId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return slugify(trimmed);
}

function normalizeKey(key: string | null | undefined) {
  if (!key) return null;
  const normalized = path.posix.normalize(key.replace(/^\/+/, ""));
  const allowedRoots = Object.values(ALLOWED_BASE_DIRS);
  if (!allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    return null;
  }
  if (normalized.includes("..")) return null;
  return normalized;
}

export function extractStorageKeyFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    if (url.startsWith("/api/media")) {
      const fakeBase = "https://local";
      const parsed = new URL(url, fakeBase);
      const key = parsed.searchParams.get("key");
      return normalizeKey(key);
    }

    if (url.startsWith("/")) {
      return normalizeKey(url);
    }

    const parsed = new URL(url);
    return normalizeKey(parsed.pathname);
  } catch (err) {
    console.error("Impossible d'extraire la clé media depuis l'URL", err);
    return null;
  }
}

function buildStorageKey(params: {
  type: MediaType;
  albumId?: string | null;
  extension: string;
  baseName: string;
}) {
  const albumPart = normalizeAlbumId(params.albumId);
  const baseDir = ALLOWED_BASE_DIRS[params.type];
  const prefix = params.type === "audio" ? "track" : "cover";
  const filename = `${prefix}-${slugify(params.baseName)}-${crypto.randomUUID()}.${params.extension}`;
  const key = path.posix.join(baseDir, albumPart, filename);
  const normalized = normalizeKey(key);
  if (!normalized) {
    throw new Error("Chemin d'écriture refusé");
  }
  return normalized;
}

function buildSignedUrl(key: string, ttlSeconds = 60 * 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${key}:${exp}`;
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
  const params = new URLSearchParams({ key, exp: String(exp), sig });
  return `/api/media?${params.toString()}`;
}

export async function persistMediaToDisk(key: string, buffer: Buffer) {
  const root = path.join(process.cwd(), "private_media");
  const filePath = path.join(root, key);
  const normalizedRoot = path.normalize(root + path.sep);
  const normalizedFile = path.normalize(filePath);
  if (!normalizedFile.startsWith(normalizedRoot)) {
    throw new Error("Chemin cible en dehors du répertoire autorisé");
  }
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(filePath, buffer);
  return filePath;
}

function chooseExtension(candidateExt: string | null, type: MediaType) {
  if (candidateExt && ALLOWED_EXTENSIONS[type].includes(candidateExt.toLowerCase())) {
    return candidateExt.toLowerCase();
  }
  return ALLOWED_EXTENSIONS[type][0];
}

export type PersistedMedia = {
  url: string;
  key: string;
  mime: string;
  size: number;
  storagePath: string;
};

export async function validateAndStoreMedia(params: {
  fileBuffer: Buffer;
  fileName: string;
  declaredMime?: string | null;
  type: MediaType;
  albumId?: string | null;
}): Promise<PersistedMedia> {
  const { fileBuffer, fileName, declaredMime, type, albumId } = params;
  const size = fileBuffer.byteLength;
  if (size > MAX_FILE_SIZES[type]) {
    const maxMb = Math.round(MAX_FILE_SIZES[type] / (1024 * 1024));
    throw new Error(`Fichier trop volumineux (max ${maxMb} Mo)`);
  }

  if (isExecutablePayload(fileBuffer)) {
    throw new Error("Fichier potentiellement exécutable détecté");
  }

  const detected = detectMimeFromBuffer(fileBuffer);
  const mime = detected.mime ?? declaredMime ?? "application/octet-stream";
  const extensionFromName = fileName.split(".").pop()?.toLowerCase() || null;
  const extension = chooseExtension(detected.ext ?? extensionFromName, type);

  if (detected.mime && !ALLOWED_MIME_BY_TYPE[type].includes(detected.mime)) {
    throw new Error("Type MIME non autorisé");
  }

  if (!detected.mime && declaredMime && !ALLOWED_MIME_BY_TYPE[type].includes(declaredMime)) {
    throw new Error("Type MIME déclaré non autorisé");
  }

  if (!detected.mime && !declaredMime) {
    throw new Error("Impossible d'identifier le type du fichier");
  }

  if (declaredMime && detected.mime && declaredMime !== detected.mime) {
    throw new Error("Le type MIME détecté ne correspond pas au fichier");
  }

  const key = buildStorageKey({
    type,
    albumId,
    extension,
    baseName: fileName.replace(/\.[^.]+$/, ""),
  });

  const storagePath = await persistMediaToDisk(key, fileBuffer);
  const url = buildSignedUrl(key);

  return { key, mime, url, size, storagePath };
}

function resolveLocalPathForKey(key: string) {
  const privateRoot = path.join(process.cwd(), "private_media");
  const privatePath = path.join(privateRoot, key);
  if (existsSync(privatePath)) return privatePath;

  const publicRoot = path.join(process.cwd(), "public");
  const publicPath = path.join(publicRoot, key.replace(/^\//, ""));
  if (existsSync(publicPath)) return publicPath;

  return privatePath;
}

export async function deleteMediaAtUrl(url: string | null | undefined) {
  const key = extractStorageKeyFromUrl(url);
  if (!key) return;
  const target = resolveLocalPathForKey(key);
  try {
    await unlink(target);
  } catch (err: unknown) {
    type WithCode = { code?: string };
    const code = typeof err === "object" && err ? (err as WithCode).code : null;
    if (code !== "ENOENT") {
      console.error("Erreur lors de la suppression du média", err);
    }
  }
}

function mimeFromExtension(ext: string | null) {
  if (!ext) return "application/octet-stream";
  return EXTENSION_TO_MIME[ext.toLowerCase()] || "application/octet-stream";
}

export async function handleSignedMediaRequest(req: Request) {
  const url = new URL(req.url);
  const keyParam = url.searchParams.get("key");
  const expParam = url.searchParams.get("exp");
  const sigParam = url.searchParams.get("sig");

  const key = normalizeKey(keyParam);
  if (!key || !expParam || !sigParam) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }

  const exp = Number(expParam);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    return NextResponse.json({ error: "Lien expiré" }, { status: 403 });
  }

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(`${key}:${exp}`)
    .digest("hex");

  const providedSig = Buffer.from(sigParam, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");

  if (
    providedSig.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedSig, expectedBuffer)
  ) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 403 });
  }

  const filePath = resolveLocalPathForKey(key);
  try {
    const stats = await stat(filePath);
    const ext = path.extname(filePath).replace(/^\./, "") || null;
    const mime = mimeFromExtension(ext);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(stats.size),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Erreur lecture média", err);
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
