// app/artist/page.tsx

import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Box, Button, Stack, Typography } from "@mui/material";
import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { AlbumGrid } from "@/app/AlbumGrid";

// Icônes MUI (si pas installées : npm i @mui/icons-material)
import InstagramIcon from "@mui/icons-material/Instagram";
import LanguageIcon from "@mui/icons-material/Language";
import EmailIcon from "@mui/icons-material/Email";
import BrushIcon from "@mui/icons-material/Brush";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";

export default async function ArtistPage() {
  // 1) Récupération de l'artiste
  const artist = await prisma.artist.findFirst();

  if (!artist) {
    return (
      <div className="main-shell">
        <aside className="main-shell__sidebar">
          <GlobalNav />
        </aside>
        <main className="main-shell__content">
          <Typography variant="h5">
            Aucun artiste trouvé en base de données.
          </Typography>
        </main>
        <PlayerBar />
      </div>
    );
  }

  // 2) Récupération des albums de cet artiste
  const albums = await prisma.album.findMany({
    where: { artistId: artist.id },
    include: {
      tracks: true,
    },
    orderBy: {
      releaseYear: "asc",
    },
  });

  const albumsForGrid = albums.map((album) => ({
    id: album.id,
    title: album.title,
    releaseYear: album.releaseYear,
    coverUrl: album.coverUrl,
    tracks: album.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      trackNumber: t.trackNumber,
      durationSeconds: t.durationSeconds,
      audioUrl: t.audioUrl,
    })),
  }));

  const {
    name,
    bio,
    imageUrl,
    instagramUrl,
    soundcloudUrl,
    bandcampUrl,
    deviantartUrl,
    websiteUrl,
    emailContact,
  } = artist;

  const portraitSrc =
    imageUrl && imageUrl.trim().length > 0 ? imageUrl : "/images/jaze.jpg";

  return (
    <div className="main-shell">
      {/* Sidebar / Topbar responsive */}
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      {/* Contenu principal */}
      <main className="main-shell__content">
        {/* Header artiste */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 3, md: 4 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ mb: 4 }}
        >
          <Box
            sx={{
              width: { xs: 160, md: 220 },
              height: { xs: 160, md: 220 },
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              bgcolor: "background.paper",
              flexShrink: 0,
            }}
          >
            <Image
              src={portraitSrc}
              alt={name}
              fill
              style={{ objectFit: "cover" }}
            />
          </Box>

          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h3"
              sx={{ fontSize: { xs: "2rem", md: "2.5rem" } }}
            >
              {name}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 700 }}
            >
              {bio || "Artiste indépendant."}
            </Typography>

            {/* Boutons de réseaux / liens */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {instagramUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<InstagramIcon />}
                >
                  Instagram
                </Button>
              )}

              {soundcloudUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={soundcloudUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<CloudQueueIcon />}
                >
                  SoundCloud
                </Button>
              )}

              {bandcampUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={bandcampUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<MusicNoteIcon />}
                >
                  Bandcamp
                </Button>
              )}

              {deviantartUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={deviantartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<BrushIcon />}
                >
                  DeviantArt
                </Button>
              )}

              {websiteUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<LanguageIcon />}
                >
                  Site web
                </Button>
              )}

              {emailContact && (
                <Button
                  variant="outlined"
                  size="small"
                  component="a"
                  href={`mailto:${emailContact}`}
                  startIcon={<EmailIcon />}
                >
                  Email
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>

        {/* Liste des albums + CTA Lire l’album (via AlbumGrid) */}
        <Typography variant="h5" sx={{ mb: 2 }}>
          Albums de {name}
        </Typography>

        <AlbumGrid albums={albumsForGrid} />
      </main>

      {/* Player global */}
      <PlayerBar />
    </div>
  );
}
