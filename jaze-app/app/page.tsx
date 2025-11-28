// app/page.tsx

import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { PlayerBar } from "./PlayerBar";
import { GlobalNav } from "./GlobalNav";

export default async function HomePage() {
  const albums = await prisma.album.findMany({
    include: {
      artist: true,
      tracks: true,
    },
    orderBy: {
      releaseYear: "asc",
    },
  });

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

        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 2 }}>
          {albums.map((album) => (
            <Box
              key={album.id}
              sx={{
                width: { xs: "100%", sm: "48%", md: 220 }, // ✅ full largeur sur mobile, 2 colonnes sur tablette
              }}
            >
              <Link
                href={`/albums/${album.id}`}
                style={{ textDecoration: "none" }}
              >
                <Card
                  sx={{
                    width: "100%",
                    bgcolor: "background.paper", // au lieu de "#111"
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
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
                        src={
                          album.coverUrl && album.coverUrl.trim().length > 0
                            ? album.coverUrl
                            : "/images/jaze.jpg"
                        }
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
                </Card>
              </Link>
            </Box>
          ))}

          {albums.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucun album pour le moment. Vérifie ton seed Prisma.
            </Typography>
          )}
        </Stack>
      </main>

      {/* Player global */}
      <PlayerBar />
    </div>
  );
}
