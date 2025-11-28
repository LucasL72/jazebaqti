"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

type TrackAdmin = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
  isExplicit: boolean;
};

type AlbumAdminDetail = {
  id: number;
  title: string;
  releaseYear: number | null;
  coverUrl: string | null;
  tracks: TrackAdmin[];
};

export function AdminAlbumDetailClient({ album }: { album: AlbumAdminDetail }) {
  const [title, setTitle] = useState(album.title);
  const [releaseYear, setReleaseYear] = useState(
    album.releaseYear ? String(album.releaseYear) : ""
  );
  const [coverUrl, setCoverUrl] = useState(album.coverUrl || "");
  const [savingAlbum, setSavingAlbum] = useState(false);

  const [tracks, setTracks] = useState<TrackAdmin[]>(album.tracks);
  const [creatingTrack, setCreatingTrack] = useState(false);
  const [newTrack, setNewTrack] = useState({
    title: "",
    trackNumber: tracks.length + 1,
    durationSeconds: "",
    audioUrl: "",
    isExplicit: false,
  });

  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState({
    title: "",
    trackNumber: "",
    durationSeconds: "",
    audioUrl: "",
    isExplicit: false,
  });

  const [error, setError] = useState<string | null>(null);

  // ---------- Upload helpers ----------
  async function uploadFile(file: File, type: "audio" | "image") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erreur upload");
    }

    const data = await res.json();
    return data.url as string;
  }

  // ---------- Album update ----------
  const handleSaveAlbum = async () => {
    setError(null);
    setSavingAlbum(true);

    try {
      const res = await fetch(`/api/admin/albums/${album.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          coverUrl: coverUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur mise à jour album");
        return;
      }
    } catch (err) {
      setError("Erreur réseau lors de la mise à jour");
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleCoverFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "image");
      setCoverUrl(url);
    } catch (err: any) {
      setError(err.message || "Erreur upload cover");
    } finally {
      e.target.value = "";
    }
  };

  // ---------- New track ----------
  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newTrack.title.trim() || !newTrack.audioUrl.trim()) {
      setError("Titre et audio sont obligatoires pour la piste");
      return;
    }

    setCreatingTrack(true);
    try {
      const res = await fetch(`/api/admin/albums/${album.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTrack.title,
          trackNumber: newTrack.trackNumber,
          durationSeconds: newTrack.durationSeconds
            ? Number(newTrack.durationSeconds)
            : null,
          audioUrl: newTrack.audioUrl,
          isExplicit: newTrack.isExplicit,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur création piste");
        return;
      }

      const created = await res.json();
      setTracks((prev) =>
        [...prev, created].sort((a, b) => a.trackNumber - b.trackNumber)
      );

      setNewTrack({
        title: "",
        trackNumber: (newTrack.trackNumber || 0) + 1,
        durationSeconds: "",
        audioUrl: "",
        isExplicit: false,
      });
    } catch (err) {
      setError("Erreur réseau création piste");
    } finally {
      setCreatingTrack(false);
    }
  };

  const handleNewTrackFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "audio");
      setNewTrack((prev) => ({ ...prev, audioUrl: url }));
    } catch (err: any) {
      setError(err.message || "Erreur upload audio piste");
    } finally {
      e.target.value = "";
    }
  };

  // ---------- Edit track ----------
  const startEditTrack = (track: TrackAdmin) => {
    setEditingTrackId(track.id);
    setEditingValues({
      title: track.title,
      trackNumber: String(track.trackNumber),
      durationSeconds: track.durationSeconds
        ? String(track.durationSeconds)
        : "",
      audioUrl: track.audioUrl,
      isExplicit: track.isExplicit,
    });
  };

  const cancelEditTrack = () => {
    setEditingTrackId(null);
  };

  const saveEditTrack = async () => {
    if (!editingTrackId) return;
    setError(null);

    try {
      const res = await fetch(`/api/admin/tracks/${editingTrackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingValues.title,
          trackNumber: editingValues.trackNumber
            ? Number(editingValues.trackNumber)
            : undefined,
          durationSeconds: editingValues.durationSeconds
            ? Number(editingValues.durationSeconds)
            : undefined,
          audioUrl: editingValues.audioUrl,
          isExplicit: editingValues.isExplicit,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur mise à jour piste");
        return;
      }

      const updated = await res.json();
      setTracks((prev) =>
        prev
          .map((t) => (t.id === updated.id ? updated : t))
          .sort((a, b) => a.trackNumber - b.trackNumber)
      );
      setEditingTrackId(null);
    } catch (err) {
      setError("Erreur réseau mise à jour piste");
    }
  };

  const handleEditTrackFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "audio");
      setEditingValues((prev) => ({ ...prev, audioUrl: url }));
    } catch (err: any) {
      setError(err.message || "Erreur upload audio piste");
    } finally {
      e.target.value = "";
    }
  };

  // ---------- Delete track ----------
  const deleteTrack = async (id: number) => {
    if (!window.confirm("Supprimer cette piste ?")) return;
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erreur suppression piste");
        return;
      }
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert("Erreur réseau suppression piste");
    }
  };

  return (
    <Stack spacing={3}>
      {/* Album header + édition */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Album #{album.id}
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Titre de l'album"
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
              label="Cover URL"
              fullWidth
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </Stack>

          {/* Upload de cover */}
          <Button variant="outlined" component="label" size="small">
            Upload cover (image)
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleCoverFileChange}
            />
          </Button>

          {coverUrl && (
            <Typography variant="caption" color="text.secondary">
              Cover actuelle : {coverUrl}
            </Typography>
          )}

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveAlbum}
            disabled={savingAlbum}
          >
            {savingAlbum ? "Enregistrement..." : "Enregistrer l'album"}
          </Button>
        </Stack>
      </Paper>

      {/* Création d'une nouvelle piste */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Ajouter une piste
        </Typography>

        <Box component="form" onSubmit={handleCreateTrack}>
          <Stack spacing={2}>
            <TextField
              label="Titre de la piste"
              fullWidth
              value={newTrack.title}
              onChange={(e) =>
                setNewTrack((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="# de piste"
                type="number"
                value={newTrack.trackNumber}
                onChange={(e) =>
                  setNewTrack((prev) => ({
                    ...prev,
                    trackNumber: Number(e.target.value),
                  }))
                }
              />
              <TextField
                label="Durée (sec)"
                type="number"
                value={newTrack.durationSeconds}
                onChange={(e) =>
                  setNewTrack((prev) => ({
                    ...prev,
                    durationSeconds: e.target.value,
                  }))
                }
              />
            </Stack>

            <TextField
              label="Audio URL"
              fullWidth
              value={newTrack.audioUrl}
              onChange={(e) =>
                setNewTrack((prev) => ({ ...prev, audioUrl: e.target.value }))
              }
              helperText="Soit une URL directe, soit tu uploades un fichier audio ci-dessous."
            />

            <Button variant="outlined" component="label" size="small">
              Upload audio
              <input
                type="file"
                hidden
                accept="audio/*"
                onChange={handleNewTrackFileChange}
              />
            </Button>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={newTrack.isExplicit}
                onChange={(e) =>
                  setNewTrack((prev) => ({
                    ...prev,
                    isExplicit: e.target.checked,
                  }))
                }
              />
              <Typography variant="body2">Piste explicite</Typography>
            </Stack>

            <Button type="submit" variant="contained" disabled={creatingTrack}>
              {creatingTrack ? "Création..." : "Ajouter la piste"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Liste / édition des pistes */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Pistes ({tracks.length})
        </Typography>

        <Stack spacing={1.5}>
          {tracks.map((track) => {
            const isEditing = editingTrackId === track.id;

            if (isEditing) {
              return (
                <Stack
                  key={track.id}
                  spacing={1}
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    pb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    #{track.id}
                  </Typography>
                  <TextField
                    label="Titre"
                    fullWidth
                    value={editingValues.title}
                    onChange={(e) =>
                      setEditingValues((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="# piste"
                      type="number"
                      value={editingValues.trackNumber}
                      onChange={(e) =>
                        setEditingValues((prev) => ({
                          ...prev,
                          trackNumber: e.target.value,
                        }))
                      }
                    />
                    <TextField
                      label="Durée (sec)"
                      type="number"
                      value={editingValues.durationSeconds}
                      onChange={(e) =>
                        setEditingValues((prev) => ({
                          ...prev,
                          durationSeconds: e.target.value,
                        }))
                      }
                    />
                  </Stack>
                  <TextField
                    label="Audio URL"
                    fullWidth
                    value={editingValues.audioUrl}
                    onChange={(e) =>
                      setEditingValues((prev) => ({
                        ...prev,
                        audioUrl: e.target.value,
                      }))
                    }
                  />
                  <Button variant="outlined" component="label" size="small">
                    Upload audio
                    <input
                      type="file"
                      hidden
                      accept="audio/*"
                      onChange={handleEditTrackFileChange}
                    />
                  </Button>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Checkbox
                      checked={editingValues.isExplicit}
                      onChange={(e) =>
                        setEditingValues((prev) => ({
                          ...prev,
                          isExplicit: e.target.checked,
                        }))
                      }
                    />
                    <Typography variant="body2">Piste explicite</Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={saveEditTrack}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={cancelEditTrack}
                    >
                      Annuler
                    </Button>
                  </Stack>
                </Stack>
              );
            }

            return (
              <Stack
                key={track.id}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  pb: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" noWrap>
                    {track.trackNumber}. {track.title}
                    {track.isExplicit && " (E)"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {track.durationSeconds
                      ? `${track.durationSeconds}s`
                      : "Durée inconnue"}{" "}
                    · {track.audioUrl}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => startEditTrack(track)}
                  >
                    Modifier
                  </Button>
                  <IconButton
                    color="error"
                    onClick={() => deleteTrack(track.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>
            );
          })}

          {tracks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune piste sur cet album.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
