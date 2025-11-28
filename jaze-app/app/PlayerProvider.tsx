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
  volume: number;
  progress: number;
  duration: number;
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
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // ⚡ Charge et lance la piste
  const loadAndPlay = (tracks: TrackInfo[], index: number) => {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= tracks.length) return;

    const track = tracks[index];

    setQueue(tracks);
    setCurrentIndex(index);
    setCurrentTrack(track);

    audio.src = track.audioUrl;
    audio.volume = volume;

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(console.error);
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
      audio
        .play()
        .then(() => {
          audio.volume = volume;
          setIsPlaying(true);
        })
        .catch(console.error);
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
      audio
        .play()
        .then(() => {
          audio.volume = volume;
          setIsPlaying(true);
        })
        .catch(console.error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, currentIndex]);

  const value: PlayerContextType = {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    volume,
    progress,
    duration,
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
