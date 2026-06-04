import { useEffect, useState } from "react";

export type AudioFormat = "opus" | "aac" | "mp3";

/**
 * Détecte le meilleur format audio supporté par le navigateur
 * Priorité: Opus > AAC > MP3
 */
export function useAudioFormat(): AudioFormat {
  const [format, setFormat] = useState<AudioFormat>("mp3");

  useEffect(() => {
    const audio = document.createElement("audio");

    const canPlay = (type: string) => {
      const support = audio.canPlayType(type);
      return support === "probably" || support === "maybe";
    };

    // Priorité : Opus (meilleur ratio qualité/taille) > AAC (iOS) > MP3.
    const detected: AudioFormat = canPlay('audio/ogg; codecs="opus"')
      ? "opus"
      : canPlay("audio/mp4; codecs=mp4a.40.2")
        ? "aac"
        : "mp3";

    // Détection de capacité au montage : synchronisation unique et légitime
    // avec une API navigateur externe (pas de rendu en cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormat(detected);
  }, []);

  return format;
}

/**
 * Convertit une URL audio en fonction du format supporté
 * Exemple: /audio/track.mp3 → /audio/track.opus (si supporté)
 */
export function getAudioUrl(baseUrl: string, preferredFormat?: AudioFormat): string {
  if (!preferredFormat) {
    // Détection synchrone côté serveur ou hydration
    return baseUrl;
  }

  // Remplace l'extension par le format préféré
  const urlWithoutExt = baseUrl.replace(/\.(mp3|opus|m4a)$/i, "");

  switch (preferredFormat) {
    case "opus":
      return `${urlWithoutExt}.opus`;
    case "aac":
      return `${urlWithoutExt}.m4a`;
    default:
      return `${urlWithoutExt}.mp3`;
  }
}

/**
 * Hook pour obtenir l'URL audio optimisée
 */
export function useOptimizedAudioUrl(baseUrl: string): string {
  const format = useAudioFormat();
  return getAudioUrl(baseUrl, format);
}
