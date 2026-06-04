import { useCallback, useEffect, useState } from "react";
import { useCsrfToken } from "./useCsrfToken";
import { useCurrentUser } from "./useCurrentUser";

export type PlaylistSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
};

export type PlaylistTrack = {
  id: number;
  title: string;
  trackNumber: number;
  durationSeconds: number | null;
  audioUrl: string;
  albumTitle: string;
  albumCoverUrl: string | null;
  position: number;
};

export function usePlaylists() {
  const { user, loading: userLoading } = useCurrentUser();
  const { csrfToken } = useCsrfToken();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutationHeaders = useCallback(() => {
    if (!csrfToken) return null;
    return { "Content-Type": "application/json", "X-CSRF-Token": csrfToken };
  }, [csrfToken]);

  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/playlists", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur playlists");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = useCallback(
    async (name: string) => {
      const headers = mutationHeaders();
      if (!headers) return null;
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Création impossible");
        return null;
      }
      const data = await res.json();
      await fetchPlaylists();
      return data?.playlist?.id as string | undefined;
    },
    [mutationHeaders, fetchPlaylists]
  );

  const renamePlaylist = useCallback(
    async (id: string, name: string) => {
      const headers = mutationHeaders();
      if (!headers) return false;
      const res = await fetch(`/api/playlists/${id}`, {
        method: "PATCH",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      if (res.ok) await fetchPlaylists();
      return res.ok;
    },
    [mutationHeaders, fetchPlaylists]
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      const headers = mutationHeaders();
      if (!headers) return false;
      const res = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
        headers,
        credentials: "same-origin",
      });
      if (res.ok) await fetchPlaylists();
      return res.ok;
    },
    [mutationHeaders, fetchPlaylists]
  );

  const addTrack = useCallback(
    async (playlistId: string, trackId: number) => {
      const headers = mutationHeaders();
      if (!headers) return false;
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ trackId }),
      });
      if (res.ok) await fetchPlaylists();
      return res.ok;
    },
    [mutationHeaders, fetchPlaylists]
  );

  const removeTrack = useCallback(
    async (playlistId: string, trackId: number) => {
      const headers = mutationHeaders();
      if (!headers) return false;
      const res = await fetch(
        `/api/playlists/${playlistId}/tracks?trackId=${trackId}`,
        { method: "DELETE", headers, credentials: "same-origin" }
      );
      return res.ok;
    },
    [mutationHeaders]
  );

  const reorderTracks = useCallback(
    async (playlistId: string, trackIds: number[]) => {
      const headers = mutationHeaders();
      if (!headers) return false;
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "PATCH",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ trackIds }),
      });
      return res.ok;
    },
    [mutationHeaders]
  );

  return {
    user,
    userLoading,
    playlists,
    loading,
    error,
    refreshPlaylists: fetchPlaylists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrack,
    removeTrack,
    reorderTracks,
  };
}

export async function fetchPlaylistDetail(id: string): Promise<{
  id: string;
  name: string;
  tracks: PlaylistTrack[];
} | null> {
  const res = await fetch(`/api/playlists/${id}`, { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.playlist ?? null;
}
