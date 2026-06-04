import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCsrfToken } from "./useCsrfToken";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Gère les « J'aime » au niveau piste (et non plus seulement album).
 * Même logique que useFavoriteAlbums : redirige vers /login si non connecté.
 */
export function useTrackFavorites() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();
  const { csrfToken } = useCsrfToken();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/track-favorites", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) refreshUser();
        return;
      }
      const data = await res.json();
      const ids = Array.isArray(data?.favorites)
        ? new Set<number>(data.favorites.map((fav: { trackId: number }) => fav.trackId))
        : new Set<number>();
      setFavoriteIds(ids);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur favoris");
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (trackId: number) => {
      if (!user) {
        if (typeof window !== "undefined") {
          const current = window.location.pathname + window.location.search;
          router.push(`/login?next=${encodeURIComponent(current)}`);
        } else {
          router.push("/login");
        }
        return false;
      }
      if (!csrfToken) {
        setError("Token CSRF manquant");
        return false;
      }

      const isFavorite = favoriteIds.has(trackId);
      try {
        const res = await fetch("/api/track-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          credentials: "same-origin",
          body: JSON.stringify({ trackId, action: isFavorite ? "remove" : "add" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Impossible de mettre à jour le favori");
          return false;
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFavorite) next.delete(trackId);
          else next.add(trackId);
          return next;
        });
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur réseau");
        return false;
      }
    },
    [csrfToken, favoriteIds, router, user]
  );

  return {
    user,
    userLoading,
    favorites: favoriteIds,
    isFavorite: (trackId: number) => favoriteIds.has(trackId),
    toggleFavorite,
    refreshFavorites: fetchFavorites,
    loading,
    error,
  };
}
