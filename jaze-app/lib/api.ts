export async function fetchAlbums() {
  const res = await fetch("/api/albums");
  if (!res.ok) throw new Error("Erreur de chargement des albums");
  return res.json();
}
