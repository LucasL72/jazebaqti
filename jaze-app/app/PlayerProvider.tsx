"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type TrackInfo = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
  albumTitle: string;
  albumCoverUrl: string | null;
};

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
  playTrackList: (tracks: TrackInfo[], startIndex: number) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  setVolume: (value: number) => void;
  seek: (seconds: number) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [queue, setQueue] = useState<TrackInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch((err) => {
        console.error("Erreur de lecture:", err);
        setError("Impossible de lire ce titre");
        setIsPlaying(false);
        setIsLoading(false);
      });
  };

  const playTrackList = (tracks: TrackInfo[], startIndex: number) => {
    loadAndPlay(tracks, startIndex);
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
        .catch((err) => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de reprendre la lecture");
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const playNext = () => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    if (currentIndex < queue.length - 1) {
      loadAndPlay(queue, currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

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
        .catch((err) => {
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

  // 🎚 Suivi du temps / durée / fin de piste
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
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
  }, [playNext]);

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
    playTrackList,
    togglePlayPause,
    playNext,
    playPrev,
    setVolume,
    seek,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* 🔊 Élément audio global unique */}
      <audio ref={audioRef} style={{ display: "none" }} />
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
