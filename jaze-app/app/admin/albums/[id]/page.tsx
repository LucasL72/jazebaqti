// app/admin/albums/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { AdminAlbumDetailClient } from "./AdminAlbumDetailClient";
import { notFound } from "next/navigation";
import { enforceAdminPageAccess } from "@/lib/admin-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAlbumDetailPage({ params }: PageProps) {
  const { id: rawId } = await params; // ✅ on attend le Promise
  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    notFound();
  }

  await enforceAdminPageAccess(`/admin/albums/${rawId}`);

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      tracks: {
        orderBy: { trackNumber: "asc" },
      },
    },
  });

  if (!album) {
    notFound();
  }

  const albumForClient = {
    id: album.id,
    title: album.title,
    releaseYear: album.releaseYear,
    coverUrl: album.coverUrl,
    tracks: album.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      trackNumber: t.trackNumber,
      durationSeconds: t.durationSeconds,
      audioUrl: t.audioUrl,
      isExplicit: t.isExplicit,
    })),
  };

  return (
    <div className="main-shell">
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      <main className="main-shell__content">
        <AdminAlbumDetailClient album={albumForClient} />
      </main>

      <PlayerBar />
    </div>
  );
}
