"use client";

import { useState } from "react";
import {
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { useRouter } from "next/navigation";
import { usePlaylists } from "@/lib/usePlaylists";

/**
 * Bouton « ajouter à une playlist » : ouvre un menu listant les playlists de
 * l'utilisateur, avec une option de création rapide. Redirige vers /login si
 * l'utilisateur n'est pas connecté.
 */
export function AddToPlaylistButton({ trackId }: { trackId: number }) {
  const router = useRouter();
  const { user, playlists, createPlaylist, addTrack } = usePlaylists();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setAnchorEl(e.currentTarget);
  };

  const handleAdd = async (playlistId: string, name: string) => {
    setAnchorEl(null);
    const ok = await addTrack(playlistId, trackId);
    setToast(ok ? `Ajouté à « ${name} »` : "Ajout impossible");
  };

  const handleCreate = async () => {
    setAnchorEl(null);
    const name = window.prompt("Nom de la nouvelle playlist");
    if (!name?.trim()) return;
    const id = await createPlaylist(name.trim());
    if (id) {
      const ok = await addTrack(id, trackId);
      setToast(ok ? `Playlist « ${name.trim()} » créée` : "Ajout impossible");
    }
  };

  return (
    <>
      <Tooltip title="Ajouter à une playlist" arrow>
        <IconButton
          size="small"
          aria-label="Ajouter à une playlist"
          onClick={handleClick}
        >
          <PlaylistAddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {playlists.map((p) => (
          <MenuItem key={p.id} onClick={() => handleAdd(p.id, p.name)}>
            <ListItemText primary={p.name} secondary={`${p.trackCount} titre(s)`} />
          </MenuItem>
        ))}
        {playlists.length > 0 && <Divider />}
        <MenuItem onClick={handleCreate}>
          <ListItemText primary="➕ Nouvelle playlist…" />
        </MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ""}
      />
    </>
  );
}
