import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { env } from "./env";
import logger from "./logger";

let ffmpegAvailable: boolean | null = null;

// Détecte une seule fois si ffmpeg est disponible sur le serveur.
function checkFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return Promise.resolve(ffmpegAvailable);
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    proc.on("error", () => {
      ffmpegAvailable = false;
      resolve(false);
    });
    proc.on("close", (code) => {
      ffmpegAvailable = code === 0;
      resolve(ffmpegAvailable);
    });
  });
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg a échoué (code ${code}): ${stderr.slice(-500)}`));
    });
  });
}

/**
 * Génère, à côté du fichier audio original, une version Opus 128 kbps
 * (`<nom>.opus`) destinée à réduire la bande passante. Opération best-effort :
 *  - désactivée si AUDIO_TRANSCODE_ENABLED=false ;
 *  - silencieuse si ffmpeg est absent ou si la version existe déjà ;
 *  - n'interrompt jamais le flux d'upload (les erreurs sont seulement loguées).
 *
 * Renvoie le chemin du fichier Opus généré, ou null si rien n'a été produit.
 */
export async function maybeTranscodeAudioToOpus(
  sourcePath: string
): Promise<string | null> {
  if (!env.AUDIO_TRANSCODE_ENABLED) return null;

  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === ".opus") return null; // déjà au bon format

  const opusPath = sourcePath.replace(/\.[^.]+$/, "") + ".opus";
  if (existsSync(opusPath)) return opusPath;

  if (!(await checkFfmpeg())) {
    logger.warn("Transcodage audio ignoré : ffmpeg introuvable");
    return null;
  }

  try {
    await runFfmpeg([
      "-y",
      "-i",
      sourcePath,
      "-c:a",
      "libopus",
      "-b:a",
      "128k",
      "-vbr",
      "on",
      "-compression_level",
      "10",
      "-map_metadata",
      "0",
      opusPath,
    ]);
    logger.info("Transcodage Opus réussi", { source: sourcePath, opus: opusPath });
    return opusPath;
  } catch (err) {
    logger.error("Échec du transcodage Opus", err, { source: sourcePath });
    return null;
  }
}
