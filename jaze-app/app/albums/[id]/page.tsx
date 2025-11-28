// app/albums/[id]/page.tsx
"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Button, Card, Divider, Stack, Typography } from "@mui/material";
import { usePlayer } from "@/app/PlayerProvider";
import { PlayerBar } from "@/app/PlayerBar";
import { GlobalNav } from "@/app/GlobalNav";

type Track = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
};

type Album = {
  id: number;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
  tracks: Track[];
};

export default function AlbumPage() {
  const params = useParams();
  const albumId = params.id;

  const [album, setAlbum] = useState<Album | null>(null);
  const { currentTrack, isPlaying, playTrackList } = usePlayer();

  useEffect(() => {
    fetch(`/api/albums/${albumId}`)
      .then((res) => res.json())
      .then((data) => setAlbum(data))
      .catch(console.error);
  }, [albumId]);

  if (!album) return <Typography>Chargement...</Typography>;

  const coverUrl =
    typeof album.coverUrl === "string" && album.coverUrl.trim().length > 0
      ? album.coverUrl
      : null;

  const tracks = [...album.tracks].sort(
    (a, b) => a.trackNumber - b.trackNumber
  );

  const queueForAlbum = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    trackNumber: t.trackNumber,
    durationSeconds: t.durationSeconds,
    audioUrl: t.audioUrl,
    albumTitle: album.title,
    albumCoverUrl: coverUrl,
  }));

  return (
    <div className="main-shell">
      {/* Sidebar / topbar responsive */}
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      {/* Contenu principal */}
      <main className="main-shell__content">
        {/* Header album */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 4 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: 260 },
              aspectRatio: "1 / 1",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
              bgcolor: "background.paper",
            }}
          >
            {coverUrl && (
              <Image
                src={coverUrl}
                alt={album.title}
                fill
                style={{ objectFit: "cover" }}
              />
            )}
          </Box>

          <Stack spacing={1}>
            <Typography
              variant="h4"
              sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
            >
              {album.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {album.releaseYear}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tracks.length} titres
            </Typography>

            {/* 👉 Bouton global Lire l’album */}
            {tracks.length > 0 && (
              <Button
                variant="contained"
                size="medium"
                sx={{ mt: 1 }}
                onClick={() => {
                  playTrackList(queueForAlbum, 0);
                }}
              >
                ▶ Lire l&apos;album depuis le début
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Tracklist */}
        <Stack spacing={1.25}>
          {tracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;

            return (
              <Card
                key={track.id}
                sx={{
                  p: { xs: 1.25, sm: 1.5 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  borderRadius: 2,
                  bgcolor: isCurrent ? "action.selected" : "background.paper",
                  border: "1px solid",
                  borderColor: isCurrent ? "primary.main" : "divider",
                  boxShadow: "none",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease",
                  "&:hover": {
                    bgcolor: isCurrent ? "action.selected" : "action.hover",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Stack spacing={0.3}>
                  <Typography
                    sx={{ fontSize: { xs: 14, sm: 16 } }}
                    color="text.primary"
                  >
                    {track.trackNumber}. {track.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: 11, sm: 12 } }}
                  >
                    {track.durationSeconds
                      ? `${Math.floor(track.durationSeconds / 60)}:${String(
                          track.durationSeconds % 60
                        ).padStart(2, "0")}`
                      : "-"}
                  </Typography>
                </Stack>

                <Button
                  variant={isCurrent && isPlaying ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    playTrackList(queueForAlbum, index);
                  }}
                  sx={{
                    ml: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isCurrent && isPlaying ? "⏸ Pause" : "▶ Écouter"}
                </Button>
              </Card>
            );
          })}
        </Stack>
      </main>

      {/* Player global */}
      <PlayerBar />
    </div>
  );
}
