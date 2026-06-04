"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useCsrfToken } from "@/lib/useCsrfToken";

export type TrackInfo = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
  albumTitle: string;
  albumCoverUrl: string | null;
};

export type RepeatMode = "none" | "one" | "all";

type PlayerContextType = {
  currentTrack: TrackInfo | null;
  queue: TrackInfo[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  progress: number;
  duration: number;
  error: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrackList: (tracks: TrackInfo[], startIndex: number) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  setVolume: (value: number) => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  // File d'attente
  playAt: (index: number) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  addToQueue: (track: TrackInfo) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Élément audio caché qui précharge la piste suivante (lecture sans latence).
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const { csrfToken } = useCsrfToken();
  const csrfRef = useRef<string | null>(null);
  // Synchronise le token dans une ref pour pouvoir l'utiliser dans les
  // gestionnaires d'événements audio sans recréer les listeners.
  useEffect(() => {
    csrfRef.current = csrfToken;
  }, [csrfToken]);
  // Horodatage de la dernière sauvegarde de position (throttle reprise).
  const lastProgressSaveRef = useRef(0);

  const [queue, setQueue] = useState<TrackInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");

  // Garde la queue originale pour pouvoir désactiver le shuffle
  const originalQueueRef = useRef<TrackInfo[]>([]);

  // Enregistre un événement de lecture côté serveur (best-effort, ignoré si
  // l'utilisateur n'est pas connecté ou si le token CSRF n'est pas prêt).
  const postPlayEvent = useCallback(
    (trackId: number, action: "play" | "progress", positionSeconds = 0) => {
      const token = csrfRef.current;
      if (!token) return;
      fetch("/api/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "same-origin",
        body: JSON.stringify({ trackId, action, positionSeconds }),
        keepalive: true,
      }).catch(() => {});
    },
    []
  );

  // ⚡ Charge et lance la piste
  const loadAndPlay = (tracks: TrackInfo[], index: number) => {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= tracks.length) return;

    const track = tracks[index];

    setQueue(tracks);
    setCurrentIndex(index);
    setCurrentTrack(track);
    setIsLoading(true);
    setError(null);

    audio.src = track.audioUrl;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
        lastProgressSaveRef.current = Date.now();
        postPlayEvent(track.id, "play");
      })
      .catch((err: unknown) => {
        console.error("Erreur de lecture:", err);
        setError("Impossible de lire ce titre");
        setIsPlaying(false);
        setIsLoading(false);
      });
  };

  const playTrackList = (tracks: TrackInfo[], startIndex: number) => {
    // Sauvegarde la queue originale
    originalQueueRef.current = tracks;

    // Si shuffle est activé, mélange la queue
    if (shuffle) {
      const shuffledTracks = [...tracks];
      // Algorithme de Fisher-Yates
      for (let i = shuffledTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTracks[i], shuffledTracks[j]] = [
          shuffledTracks[j],
          shuffledTracks[i],
        ];
      }
      loadAndPlay(shuffledTracks, 0);
    } else {
      loadAndPlay(tracks, startIndex);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      if (queue.length > 0) {
        loadAndPlay(queue, currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      setError(null);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de reprendre la lecture");
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const playNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    // Mode repeat = "one" : rejoue la même piste
    if (repeat === "one") {
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err: unknown) => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de répéter ce titre");
        });
      return;
    }

    // Si on n'est pas à la fin de la queue
    if (currentIndex < queue.length - 1) {
      loadAndPlay(queue, currentIndex + 1);
    } else if (repeat === "all") {
      // Mode repeat = "all" : reboucle au début
      loadAndPlay(queue, 0);
    } else {
      // Mode repeat = "none" : arrête la lecture
      setIsPlaying(false);
    }
  }, [queue, currentIndex, repeat]);

  const playPrev = () => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    if (currentIndex > 0) {
      loadAndPlay(queue, currentIndex - 1);
    } else if (currentIndex === 0 && currentTrack) {
      audio.currentTime = 0;
      setIsLoading(true);
      setError(null);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de relire ce titre");
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const setVolume = (value: number) => {
    const v = Math.min(1, Math.max(0, value));
    setVolumeState(v);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = v;
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const clamped = Math.min(duration, Math.max(0, seconds));
    audio.currentTime = clamped;
    setProgress(clamped);
  };

  const toggleShuffle = () => {
    if (!shuffle && queue.length > 0) {
      // Activation du shuffle : mélange la queue
      const shuffledTracks = [...queue];
      // Garde la piste actuelle en première position
      if (currentTrack && currentIndex >= 0) {
        // Retire la piste actuelle
        shuffledTracks.splice(currentIndex, 1);
        // Mélange le reste avec Fisher-Yates
        for (let i = shuffledTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledTracks[i], shuffledTracks[j]] = [
            shuffledTracks[j],
            shuffledTracks[i],
          ];
        }
        // Remet la piste actuelle au début
        shuffledTracks.unshift(currentTrack);
        setQueue(shuffledTracks);
        setCurrentIndex(0);
      }
      setShuffle(true);
    } else if (shuffle && originalQueueRef.current.length > 0) {
      // Désactivation du shuffle : revient à la queue originale
      const originalQueue = originalQueueRef.current;
      setQueue(originalQueue);
      // Retrouve l'index de la piste actuelle dans la queue originale
      if (currentTrack) {
        const newIndex = originalQueue.findIndex((t: TrackInfo) => t.id === currentTrack.id);
        setCurrentIndex(newIndex >= 0 ? newIndex : 0);
      }
      setShuffle(false);
    }
  };

  const toggleRepeat = () => {
    // Cycle : none -> all -> one -> none
    setRepeat((prev: RepeatMode) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  };

  // === File d'attente ===
  const playAt = (index: number) => {
    if (index >= 0 && index < queue.length) {
      loadAndPlay(queue, index);
    }
  };

  const removeFromQueue = (index: number) => {
    if (index < 0 || index >= queue.length) return;
    // On ne retire pas la piste en cours de lecture.
    if (index === currentIndex) return;
    const next = [...queue];
    next.splice(index, 1);
    setQueue(next);
    originalQueueRef.current = next;
    if (index < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const reorderQueue = (from: number, to: number) => {
    if (
      from < 0 ||
      to < 0 ||
      from >= queue.length ||
      to >= queue.length ||
      from === to
    ) {
      return;
    }
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setQueue(next);
    originalQueueRef.current = next;
    // Recalcule l'index courant après le déplacement.
    const newCurrent = next.findIndex((t) => t.id === currentTrack?.id);
    if (newCurrent >= 0) setCurrentIndex(newCurrent);
  };

  const addToQueue = (track: TrackInfo) => {
    setQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const next = [...prev, track];
      originalQueueRef.current = next;
      return next;
    });
  };

  // 🎚 Suivi du temps / durée / fin de piste
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      // Sauvegarde la position toutes les ~15s pour la reprise de lecture.
      const now = Date.now();
      if (currentTrack && now - lastProgressSaveRef.current > 15000) {
        lastProgressSaveRef.current = now;
        postPlayEvent(currentTrack.id, "progress", audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playNext, currentTrack, postPlayEvent]);

  // 🔮 Préchargement de la piste suivante pour une lecture sans latence.
  useEffect(() => {
    const preload = preloadRef.current;
    if (!preload) return;
    const nextIndex = currentIndex + 1;
    const nextTrack = repeat === "all" && nextIndex >= queue.length
      ? queue[0]
      : queue[nextIndex];
    if (nextTrack && preload.src !== nextTrack.audioUrl) {
      preload.src = nextTrack.audioUrl;
      preload.load();
    }
  }, [currentIndex, queue, repeat]);

  // 🧹 Cleanup à la destruction du composant
  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  const value: PlayerContextType = {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isLoading,
    volume,
    progress,
    duration,
    error,
    shuffle,
    repeat,
    playTrackList,
    togglePlayPause,
    playNext,
    playPrev,
    setVolume,
    seek,
    toggleShuffle,
    toggleRepeat,
    playAt,
    removeFromQueue,
    reorderQueue,
    addToQueue,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* 🔊 Élément audio global unique */}
      <audio ref={audioRef} style={{ display: "none" }} />
      {/* 🔮 Élément caché de préchargement de la piste suivante */}
      <audio ref={preloadRef} preload="auto" style={{ display: "none" }} />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
