"use client";

import { useState, useMemo } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  IconButton,
} from "@mui/material";
import { AlbumGrid } from "./AlbumGrid";

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

export function AlbumSearch({ albums }: { albums: AlbumForGrid[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrage des albums en temps réel
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums;

    const query = searchQuery.toLowerCase().trim();

    return albums.filter((album) => {
      // Recherche par titre
      const matchTitle = album.title.toLowerCase().includes(query);

      // Recherche par année
      const matchYear = album.releaseYear?.toString().includes(query);

      return matchTitle || matchYear;
    });
  }, [albums, searchQuery]);

  const handleClear = () => {
    setSearchQuery("");
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          fullWidth
          placeholder="Rechercher par titre ou année..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span style={{ fontSize: "20px" }}>🔍</span>
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  aria-label="Effacer la recherche"
                >
                  ✕
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: { xs: "100%", md: 600 },
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.paper",
            },
          }}
        />
      </Stack>

      {searchQuery && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`${filteredAlbums.length} résultat${filteredAlbums.length > 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      <AlbumGrid albums={filteredAlbums} />
    </Box>
  );
}
