"use client";

import Image from "next/image";
import { usePlayer } from "./PlayerProvider";
import {
  Box,
  Button,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

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
                sx={{
                  color: shuffle ? "primary.main" : "text.secondary",
                  opacity: shuffle ? 1 : 0.5,
                }}
              >
                🔀
              </IconButton>
            </Tooltip>

            <Button onClick={playPrev} disabled={isLoading} size="small">
              ⏮
            </Button>
            <Button onClick={togglePlayPause} disabled={isLoading}>
              {isLoading ? "⏳" : isPlaying ? "⏸" : "▶"}
            </Button>
            <Button onClick={playNext} disabled={isLoading} size="small">
              ⏭
            </Button>

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
                sx={{
                  color: repeat !== "none" ? "primary.main" : "text.secondary",
                  opacity: repeat !== "none" ? 1 : 0.5,
                }}
              >
                {repeat === "one" ? "🔂" : "🔁"}
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
            <Typography variant="caption">Volume</Typography>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(_, v) => setVolume(Number(v))}
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
            onChange={(_, v) => seek((Number(v) / 100) * duration)}
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
