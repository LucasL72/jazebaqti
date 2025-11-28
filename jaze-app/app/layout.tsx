import type { Metadata } from "next";
import "../styles/globals.scss"; // ✔ bon chemin
import { AppThemeProvider } from "./AppThemeProvider";
import { PlayerProvider } from "./PlayerProvider";

export const metadata: Metadata = {
  title: "Jaze Baqti -  Streaming",
  description: "Site de streaming dédié à Jaze Baqti",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AppThemeProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
