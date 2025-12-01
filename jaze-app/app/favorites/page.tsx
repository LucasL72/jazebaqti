"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { useFavoriteAlbums } from "@/lib/useFavoriteAlbums";

type FavoriteAlbum = {
  id: number;
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

export default function FavoritesPage() {
  const { favorites, user, loading, error, isFavorite, toggleFavorite, refreshFavorites } =
    useFavoriteAlbums();
  const [albums, setAlbums] = useState<FavoriteAlbum[]>([]);

  useEffect(() => {
    const fetchAlbums = async () => {
      if (!favorites.size) {
        setAlbums([]);
        return;
      }

      const response = await fetch(`/api/albums?ids=${Array.from(favorites).join(",")}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data?.albums)) {
        const mapped: FavoriteAlbum[] = data.albums.map((album: FavoriteAlbum) => ({
          id: album.id,
          title: album.title,
          coverUrl: album.coverUrl,
          releaseYear: album.releaseYear,
        }));
        setAlbums(mapped);
      }
    };

    void fetchAlbums();
  }, [favorites]);

  const renderContent = () => {
    if (!user) {
      return (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" gutterBottom>
            Connectez-vous pour gérer vos favoris
          </Typography>
          <Button variant="contained" href="/login?next=/favorites">
            Se connecter
          </Button>
        </Box>
      );
    }

    if (loading && !albums.length) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography>Chargement de vos favoris...</Typography>
        </Stack>
      );
    }

    if (!albums.length) {
      return (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" gutterBottom>
            Aucun favori pour le moment
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Ajoutez un album depuis sa page ou depuis la grille.
          </Typography>
          <Button variant="outlined" href="/">
            Découvrir les albums
          </Button>
        </Box>
      );
    }

    return (
      <Stack direction="row" flexWrap="wrap" spacing={2} sx={{ rowGap: 2 }}>
        {albums.map((album) => {
          const cover = album.coverUrl || "/images/jaze.jpg";
          const favorite = isFavorite(album.id);

          return (
            <Box key={album.id} sx={{ width: { xs: "100%", sm: "48%", md: 220 } }}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Link href={`/albums/${album.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <CardActionArea>
                    <Box sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
                      <Image src={cover} alt={album.title} fill style={{ objectFit: "cover" }} />
                    </Box>
                    <CardContent>
                      <Typography variant="subtitle1" noWrap>
                        {album.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {album.releaseYear ?? "Année inconnue"}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Link>
                <Box sx={{ p: 1.5, pt: 0, mt: "auto", display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant={favorite ? "contained" : "outlined"}
                    size="small"
                    onClick={() => toggleFavorite(album.id).then(() => refreshFavorites())}
                  >
                    {favorite ? "Retirer" : "Ajouter"}
                  </Button>
                </Box>
              </Card>
            </Box>
          );
        })}
      </Stack>
    );
  };

  return (
    <div className="main-shell">
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      <main className="main-shell__content">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Vos albums favoris
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enregistrez vos coups de cœur pour y revenir rapidement.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}

        {renderContent()}
      </main>

      <PlayerBar />
    </div>
  );
}
