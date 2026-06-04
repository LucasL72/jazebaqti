"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  fetchPlaylistDetail,
  usePlaylists,
  type PlaylistTrack,
} from "@/lib/usePlaylists";
import { usePlayer, type TrackInfo } from "@/app/PlayerProvider";

function toQueue(tracks: PlaylistTrack[]): TrackInfo[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    trackNumber: t.trackNumber,
    durationSeconds: t.durationSeconds,
    audioUrl: t.audioUrl,
    albumTitle: t.albumTitle,
    albumCoverUrl: t.albumCoverUrl,
  }));
}

export function PlaylistsClient() {
  const {
    user,
    userLoading,
    playlists,
    createPlaylist,
    deletePlaylist,
    removeTrack,
    reorderTracks,
  } = usePlaylists();
  const { playTrackList } = usePlayer();
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlaylistTrack[]>([]);

  useEffect(() => {
    if (!expanded) return;
    fetchPlaylistDetail(expanded).then((p) => setDetail(p?.tracks ?? []));
  }, [expanded]);

  if (!userLoading && !user) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Mes playlists
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <Link href="/login">Connectez-vous</Link> pour créer et gérer vos
          playlists.
        </Typography>
      </Box>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName.trim());
    setNewName("");
  };

  const refreshDetail = (id: string) =>
    fetchPlaylistDetail(id).then((p) => setDetail(p?.tracks ?? []));

  const move = async (id: string, from: number, to: number) => {
    if (to < 0 || to >= detail.length) return;
    const next = [...detail];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDetail(next);
    await reorderTracks(id, next.map((t) => t.id));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Mes playlists
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 3, maxWidth: 480 }}>
        <TextField
          size="small"
          fullWidth
          label="Nouvelle playlist"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()}>
          Créer
        </Button>
      </Stack>

      {playlists.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune playlist pour l&apos;instant. Créez-en une ci-dessus, puis
          ajoutez des titres depuis une page album.
        </Typography>
      ) : (
        playlists.map((p) => (
          <Accordion
            key={p.id}
            expanded={expanded === p.id}
            onChange={(_, isOpen) => setExpanded(isOpen ? p.id : null)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: "100%", pr: 2 }}
              >
                <Typography>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.trackCount} titre(s)
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  disabled={detail.length === 0}
                  onClick={() => playTrackList(toQueue(detail), 0)}
                >
                  Tout lire
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    if (window.confirm(`Supprimer la playlist « ${p.name} » ?`)) {
                      deletePlaylist(p.id);
                      setExpanded(null);
                    }
                  }}
                >
                  Supprimer
                </Button>
              </Stack>

              {detail.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Playlist vide.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {detail.map((track, index) => (
                    <ListItem
                      key={track.id}
                      disablePadding
                      secondaryAction={
                        <Stack direction="row">
                          <IconButton
                            size="small"
                            aria-label="Monter"
                            disabled={index === 0}
                            onClick={() => move(p.id, index, index - 1)}
                          >
                            <ArrowUpwardIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Descendre"
                            disabled={index === detail.length - 1}
                            onClick={() => move(p.id, index, index + 1)}
                          >
                            <ArrowDownwardIcon fontSize="inherit" />
                          </IconButton>
                          <Tooltip title="Retirer" arrow>
                            <IconButton
                              size="small"
                              aria-label="Retirer de la playlist"
                              onClick={async () => {
                                await removeTrack(p.id, track.id);
                                await refreshDetail(p.id);
                              }}
                            >
                              <DeleteOutlineIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <ListItemButton
                        onClick={() => playTrackList(toQueue(detail), index)}
                        sx={{ pr: 12 }}
                      >
                        <ListItemText
                          primary={`${index + 1}. ${track.title}`}
                          secondary={track.albumTitle}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
