// app/admin/albums/AdminAlbumsClient.tsx
"use client";

import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import { useRouter } from "next/navigation";

type AlbumAdmin = {
  id: number;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
  tracksCount: number;
};

export function AdminAlbumsClient({
  albums: initialAlbums,
}: {
  albums: AlbumAdmin[];
}) {
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumAdmin[]>(initialAlbums);

  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Erreur inattendue";

  // Helper d’upload pour la cover (image)
  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "image"); // côté API: image → /images/albums

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erreur upload cover");
    }

    const data = await res.json();
    return data.url as string;
  }

  const handleCoverFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverUrl(url); // on pré-remplit le champ Cover URL avec le résultat
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          coverUrl: coverUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur à la création");
        return;
      }

      const created = await res.json();

      setAlbums((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          releaseYear: created.releaseYear,
          coverUrl: created.coverUrl,
          tracksCount: 0,
        },
      ]);

      // reset du formulaire
      setTitle("");
      setReleaseYear("");
      setCoverUrl("");
      // On pourrait router vers la page détail directement, si tu veux :
      // router.push(`/admin/albums/${created.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cet album et ses pistes ?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/albums/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erreur à la suppression");
        return;
      }

      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Gestion des albums
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crée un album (avec cover) puis gère ses pistes depuis l&apos;écran de
          détail.
        </Typography>
      </Box>

      {/* Formulaire de création */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Nouvel album
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <TextField
              label="Titre"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Année de sortie"
                fullWidth
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                type="number"
              />
              <TextField
                label="Cover URL (optionnel)"
                fullWidth
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                helperText="Tu peux renseigner une URL directe ou uploader une image ci-dessous."
              />
            </Stack>

            <Button
              variant="outlined"
              component="label"
              size="small"
              disabled={uploadingCover}
            >
              {uploadingCover ? "Upload cover..." : "Upload cover (image)"}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleCoverFileChange}
              />
            </Button>

            {coverUrl && (
              <Typography variant="caption" color="text.secondary">
                Cover actuelle pour la création : {coverUrl}
              </Typography>
            )}

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? "Création..." : "Créer album"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Liste des albums */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Albums existants ({albums.length})
        </Typography>

        <Stack spacing={1.5}>
          {albums.map((album) => (
            <Stack
              key={album.id}
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                pb: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" noWrap>
                  #{album.id} — {album.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {album.releaseYear || "Année inconnue"} · {album.tracksCount}{" "}
                  piste(s)
                  {album.coverUrl ? ` · cover: ${album.coverUrl}` : ""}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => router.push(`/admin/albums/${album.id}`)}
                >
                  Gérer
                </Button>

                <IconButton
                  color="error"
                  onClick={() => handleDelete(album.id)}
                  disabled={deletingId === album.id}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Stack>
          ))}

          {albums.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucun album pour le moment.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
