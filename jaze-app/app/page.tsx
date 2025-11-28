// app/page.tsx

import { prisma } from "@/lib/prisma";
import { Typography } from "@mui/material";
import { PlayerBar } from "./PlayerBar";
import { GlobalNav } from "./GlobalNav";
import { AlbumGrid } from "./AlbumGrid";

export default async function HomePage() {
  const albums = await prisma.album.findMany({
    include: {
      tracks: true,
    },
    orderBy: {
      releaseYear: "asc",
    },
  });

  // On formate les données pour les passer au composant client
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

  return (
    <div className="main-shell">
      {/* Sidebar / Topbar responsive */}
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      {/* Contenu principal */}
      <main className="main-shell__content">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Albums de Jaze Baqti
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
          sx={{ mb: 3 }}
        >
          Un espace dédié à la musique de Jaze Baqti, avec lecture continue,
          vinyle animé et player global persistant.
        </Typography>

        <AlbumGrid albums={albumsForGrid} />
      </main>

      {/* Player global persistant */}
      <PlayerBar />
    </div>
  );
}
