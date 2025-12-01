// app/admin/albums/page.tsx
import { prisma } from "@/lib/prisma";
import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { AdminAlbumsClient } from "./AdminAlbumsClient";
import { enforceAdminPageAccess } from "@/lib/admin-session";

export default async function AdminAlbumsPage() {
  await enforceAdminPageAccess("/admin/albums");

  const albums = await prisma.album.findMany({
    include: {
      _count: {
        select: { tracks: true },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const albumsForClient = albums.map((a) => ({
    id: a.id,
    title: a.title,
    releaseYear: a.releaseYear,
    coverUrl: a.coverUrl,
    tracksCount: a._count.tracks,
  }));

  return (
    <div className="main-shell">
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      <main className="main-shell__content">
        <AdminAlbumsClient albums={albumsForClient} />
      </main>

      {/* Tu peux virer le player en admin si tu veux, mais ça marche aussi comme ça */}
      <PlayerBar />
    </div>
  );
}
