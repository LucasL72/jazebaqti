const MAX_SIZES = {
  image: 10 * 1024 * 1024, // 10 MB
  audio: 40 * 1024 * 1024, // 40 MB
};

const ALLOWED_TYPES: Record<"image" | "audio", string[]> = {
  image: ["image/webp", "image/png", "image/jpeg"],
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
};

export function validateFileInput(file: File, type: "image" | "audio") {
  if (file.size > MAX_SIZES[type]) {
    const limitMb = Math.round((MAX_SIZES[type] / 1024 / 1024) * 10) / 10;
    return `Fichier trop volumineux (max ${limitMb} Mo)`;
  }

  const allowedTypes = ALLOWED_TYPES[type];
  if (!allowedTypes.includes(file.type)) {
    return "Type de fichier non autorisé";
  }

  return null;
}
