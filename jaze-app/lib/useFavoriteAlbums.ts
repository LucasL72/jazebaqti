import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCsrfToken } from "./useCsrfToken";
import { useCurrentUser } from "./useCurrentUser";

export function useFavoriteAlbums() {
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
      const res = await fetch("/api/favorites", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) {
          refreshUser();
        }
        return;
      }
      const data = await res.json();
      const ids = Array.isArray(data?.favorites)
        ? new Set<number>(data.favorites.map((fav: { albumId: number }) => fav.albumId))
        : new Set<number>();
      setFavoriteIds(ids);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur favoris";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (albumId: number) => {
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

      const isFavorite = favoriteIds.has(albumId);
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            albumId,
            action: isFavorite ? "remove" : "add",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Impossible de mettre à jour le favori");
          return false;
        }

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFavorite) {
            next.delete(albumId);
          } else {
            next.add(albumId);
          }
          return next;
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur réseau";
        setError(message);
        return false;
      }
    },
    [csrfToken, favoriteIds, router, user]
  );

  return {
    user,
    userLoading,
    favorites: favoriteIds,
    isFavorite: (albumId: number) => favoriteIds.has(albumId),
    toggleFavorite,
    refreshFavorites: fetchFavorites,
    loading,
    error,
  };
}
