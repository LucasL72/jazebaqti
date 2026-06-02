"use client";

import Image from "next/image";
import { usePlayer } from "./PlayerProvider";
import {
  Box,
  CircularProgress,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    progress,
    duration,
    error,
    shuffle,
    repeat,
    togglePlayPause,
    playNext,
    playPrev,
    setVolume,
    seek,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const coverUrl = currentTrack?.albumCoverUrl ?? null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <footer className="main-shell__player">
      <Stack direction="column" spacing={1} sx={{ width: "100%" }}>
        {/* Ligne du haut */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Vinyle + titre */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ width: { xs: "100%", sm: "33%" } }}
          >
            <Box
              sx={{
                position: "relative",
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
                bgcolor: "#111",
                flexShrink: 0,
              }}
              className={isPlaying ? "vinyl vinyl--spinning" : "vinyl"}
            >
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt="cover"
                  fill
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "text.secondary",
                  }}
                >
                  JZ
                </Box>
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {currentTrack
                  ? `${currentTrack.trackNumber}. ${currentTrack.title}`
                  : "Aucune lecture"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {error ? error : currentTrack?.albumTitle ?? ""}
              </Typography>
            </Box>
          </Stack>

          {/* Boutons */}
          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1 }}
            justifyContent="center"
            alignItems="center"
            sx={{ width: { xs: "100%", sm: "33%" } }}
          >
            {/* Shuffle */}
            <Tooltip
              title={shuffle ? "Shuffle activé" : "Activer le shuffle"}
              arrow
            >
              <IconButton
                onClick={toggleShuffle}
                disabled={isLoading}
                size="small"
                aria-label="Lecture aléatoire"
                aria-pressed={shuffle}
                sx={{
                  color: shuffle ? "primary.main" : "text.secondary",
                  opacity: shuffle ? 1 : 0.6,
                }}
              >
                <ShuffleIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <IconButton
              onClick={playPrev}
              disabled={isLoading}
              size="small"
              aria-label="Titre précédent"
            >
              <SkipPreviousIcon />
            </IconButton>
            <IconButton
              onClick={togglePlayPause}
              disabled={isLoading}
              color="primary"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayArrowIcon />
              )}
            </IconButton>
            <IconButton
              onClick={playNext}
              disabled={isLoading}
              size="small"
              aria-label="Titre suivant"
            >
              <SkipNextIcon />
            </IconButton>

            {/* Repeat */}
            <Tooltip
              title={
                repeat === "none"
                  ? "Répétition désactivée"
                  : repeat === "all"
                    ? "Répéter la file"
                    : "Répéter le titre"
              }
              arrow
            >
              <IconButton
                onClick={toggleRepeat}
                disabled={isLoading}
                size="small"
                aria-label="Répétition"
                aria-pressed={repeat !== "none"}
                sx={{
                  color: repeat !== "none" ? "primary.main" : "text.secondary",
                  opacity: repeat !== "none" ? 1 : 0.6,
                }}
              >
                {repeat === "one" ? (
                  <RepeatOneIcon fontSize="small" />
                ) : (
                  <RepeatIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Volume */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              width: { xs: "100%", sm: "33%" },
              justifyContent: "flex-end",
            }}
          >
            <VolumeUpIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(_: Event, v: number | number[]) => setVolume(Number(v))}
              aria-label="Volume"
              sx={{ width: { xs: "60%", sm: 120 } }}
            />
          </Stack>
        </Stack>

        {/* Barre de progression */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ width: 40 }} variant="caption">
            {formatTime(progress)}
          </Typography>

          <Slider
            min={0}
            max={100}
            value={progressPercent}
            onChange={(_: Event, v: number | number[]) => seek((Number(v) / 100) * duration)}
            sx={{ flex: 1 }}
          />

          <Typography sx={{ width: 40 }} variant="caption">
            {formatTime(duration)}
          </Typography>
        </Stack>
      </Stack>
    </footer>
  );
}
