"use client";

import {
  createTheme,
  CssBaseline,
  ThemeProvider,
  PaletteMode,
} from "@mui/material";
import { createContext, useEffect, useMemo, useState } from "react";

type ColorModeContextType = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>({
  mode: "dark",
  toggleColorMode: () => {},
});

function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      background: {
        default: mode === "dark" ? "#050505" : "#f5f5f5",
        paper: mode === "dark" ? "#111111" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#ffffff" : "#111111",
        secondary: mode === "dark" ? "#b3b3b3" : "#555555",
      },
      primary: {
        main: mode === "dark" ? "#ffffff" : "#000000",
      },
    },
    typography: {
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    
  });
  
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // 🔥 Initialisation du mode SANS useEffect
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window === "undefined") {
      // côté serveur : on ne sait pas, on part sur dark
      return "dark";
    }

    const stored = window.localStorage.getItem(
      "color-mode"
    ) as PaletteMode | null;

    if (stored === "light" || stored === "dark") {
      return stored;
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    return prefersDark ? "dark" : "light";
  });

  // 👉 Effet qui ne fait QUE synchroniser le DOM (pas de setState)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = mode;
    }
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          if (typeof window !== "undefined") {
            window.localStorage.setItem("color-mode", next);
          }
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = next;
          }
          return next;
        });
      },
    }),
    [mode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
