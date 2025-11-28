// app/AlbumGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { usePlayer } from "./PlayerProvider";

type TrackForGrid = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
};

type AlbumForGrid = {
  id: number;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
  tracks: TrackForGrid[];
};

export function AlbumGrid({ albums }: { albums: AlbumForGrid[] }) {
  const { playTrackList } = usePlayer();

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 2 }}>
      {albums.map((album) => {
        const sortedTracks = [...album.tracks].sort(
          (a, b) => a.trackNumber - b.trackNumber
        );

        const cover =
          album.coverUrl && album.coverUrl.trim().length > 0
            ? album.coverUrl
            : "/images/jaze.jpg";

        return (
          <Box
            key={album.id}
            sx={{
              width: { xs: "100%", sm: "48%", md: 220 },
            }}
          >
            <Card
              sx={{
                width: "100%",
                bgcolor: "background.paper",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {/* On garde la card cliquable pour aller sur la page album */}
              <Link
                href={`/albums/${album.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <CardActionArea>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <Image
                      src={cover}
                      alt={album.title}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </Box>

                  <CardContent sx={{ p: 1.5 }}>
                    <Typography
                      variant="subtitle1"
                      noWrap
                      sx={{ fontSize: { xs: 14, sm: 16 } }}
                    >
                      {album.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, fontSize: { xs: 12, sm: 14 } }}
                    >
                      {album.releaseYear ?? "Année inconnue"}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        display: "block",
                        fontSize: { xs: 11, sm: 12 },
                      }}
                    >
                      {album.tracks.length} titres
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>

              {/* Bouton Lire l’album (contrôle le player global) */}
              {sortedTracks.length > 0 && (
                <Box
                  sx={{
                    px: 1.5,
                    pb: 1.5,
                    pt: 0.5,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const queue = sortedTracks.map((t) => ({
                        id: t.id,
                        title: t.title,
                        trackNumber: t.trackNumber,
                        durationSeconds: t.durationSeconds,
                        audioUrl: t.audioUrl,
                        albumTitle: album.title,
                        albumCoverUrl: cover,
                      }));
                      playTrackList(queue, 0);
                    }}
                  >
                    ▶ Lire l&apos;album
                  </Button>
                </Box>
              )}
            </Card>
          </Box>
        );
      })}

      {albums.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Aucun album pour le moment.
        </Typography>
      )}
    </Stack>
  );
}
