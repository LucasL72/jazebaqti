import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { PlaylistsClient } from "./PlaylistsClient";

export const metadata = { title: "Mes playlists – Jaze Baqti" };

export default function PlaylistsPage() {
  return (
    <div className="main-shell">
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>
      <main className="main-shell__content">
        <PlaylistsClient />
      </main>
      <PlayerBar />
    </div>
  );
}
