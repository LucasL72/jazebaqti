"use client";

import { useEffect, useContext, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { usePathname, useRouter } from "next/navigation";
import { ColorModeContext } from "./AppThemeProvider";
import { useCsrfToken } from "@/lib/useCsrfToken";
import { useCurrentUser } from "@/lib/useCurrentUser";

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Artiste", href: "/artist" },
  { label: "Mes favoris", href: "/favorites" },
  { label: "Mes playlists", href: "/playlists" },
];

export function GlobalNav() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const colorMode = useContext(ColorModeContext);
  const { csrfToken, csrfError } = useCsrfToken();
  const { user, loading: userLoading, refresh } = useCurrentUser();

  useEffect(() => {
    if (csrfError) {
      console.error("Erreur CSRF", csrfError);
    }
  }, [csrfError]);

  const isAdminPage = pathname?.startsWith("/admin");
  const isUserAdmin = user?.role === "admin";

  const handleLogout = async () => {
    if (!csrfToken) return;
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      credentials: "same-origin",
    });
    router.push("/admin/login");
    router.refresh();
  };

  const handleUserLogout = async () => {
    if (!csrfToken) return;
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      credentials: "same-origin",
    });
    refresh();
    router.push("/");
  };

  const toggleDrawer = () => setOpen((prev: boolean) => !prev);
  const closeDrawer = () => setOpen(false);

  // Contrôles de session partagés entre la sidebar desktop et le drawer mobile
  // (infos utilisateur, bascule de thème, connexion / déconnexion).
  const sessionControls = (
    <>
      {user && (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {user.name || "Profil"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      )}
      <Button
        variant="text"
        onClick={colorMode.toggleColorMode}
        startIcon={
          theme.palette.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />
        }
      >
        Mode {theme.palette.mode === "dark" ? "clair" : "sombre"}
      </Button>

      {isAdminPage && (
        <Button variant="text" color="error" onClick={handleLogout}>
          Déconnexion
        </Button>
      )}
      {!isAdminPage && user && (
        <Button variant="text" color="error" onClick={handleUserLogout}>
          Se déconnecter
        </Button>
      )}
      {!isAdminPage && !user && (
        <Button
          variant="contained"
          onClick={() => router.push("/login")}
          disabled={userLoading}
        >
          Connexion / Inscription
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* -------------------- VERSION DESKTOP -------------------- */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Logo + navigation */}
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
            <Image
              src="/images/logo-jaze.svg"
              alt="logo"
              width={32}
              height={32}
            />
            <Box>
              <Typography variant="h6">Jaze Baqti</Typography>
              <Typography variant="caption" color="text.secondary">
                Streaming dédié
              </Typography>
            </Box>
          </Stack>

          <Typography variant="overline" color="text.secondary">
            Navigation
          </Typography>

          <Stack spacing={1.5} mt={1}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  {item.label}
                </Typography>
              </Link>
            ))}
            {/* Lien vers dashboard admin pour les admins sur pages publiques */}
            {!isAdminPage && isUserAdmin && (
              <Link href="/admin/albums" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" }, mt: 1, fontWeight: 600 }}
                >
                  Dashboard Admin
                </Typography>
              </Link>
            )}
            {/* Liens admin quand on est sur une page admin */}
            {isAdminPage && (
              <Link href="/admin/albums" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" }, mt: 1 }}
                >
                  Albums (admin)
                </Typography>
              </Link>
            )}
            {isAdminPage && (
              <Link href="/admin/audit" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  Audit & alertes
                </Typography>
              </Link>
            )}
            {isAdminPage && (
              <Link href="/admin/profile" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  Mon profil (admin)
                </Typography>
              </Link>
            )}
            {/* Profil utilisateur */}
            {!isAdminPage && user && (
              <Link href="/profile" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  Mon profil
                </Typography>
              </Link>
            )}
          </Stack>
        </Box>

        {/* Boutons du bas */}
        <Box
          sx={{
            mt: "auto",
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={1}>{sessionControls}</Stack>
        </Box>
      </Box>

      {/* -------------------- VERSION MOBILE -------------------- */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Logo */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Image
            src="/images/logo-jaze.svg"
            alt="logo"
            width={32}
            height={32}
          />
          <Typography variant="h6">Jaze</Typography>
        </Stack>

        {/* Toggle dark/light */}
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {/* Burger */}
        <IconButton onClick={toggleDrawer}>
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Drawer mobile */}
      <Drawer anchor="left" open={open} onClose={closeDrawer}>
        <Box
          sx={{
            width: 260,
            height: "100%",
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            p: 2,
          }}
        >
          {/* Header drawer */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Image
                src="/images/logo-jaze.svg"
                alt="logo"
                width={32}
                height={32}
              />
              <Typography variant="h6">Jaze Baqti</Typography>
            </Stack>

            <IconButton onClick={closeDrawer}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Menu */}
          <List sx={{ flex: 1 }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </Link>
            ))}
            {/* Lien vers dashboard admin pour les admins sur pages publiques */}
            {!isAdminPage && isUserAdmin && (
              <Link
                href="/admin/albums"
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary="Dashboard Admin" primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              </Link>
            )}
            {/* Liens admin quand on est sur une page admin */}
            {isAdminPage && (
              <Link
                href="/admin/albums"
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary="Albums (admin)" />
                </ListItemButton>
              </Link>
            )}
            {isAdminPage && (
              <Link
                href="/admin/audit"
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary="Audit & alertes" />
                </ListItemButton>
              </Link>
            )}
            {isAdminPage && (
              <Link
                href="/admin/profile"
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary="Mon profil (admin)" />
                </ListItemButton>
              </Link>
            )}
            {/* Profil utilisateur */}
            {!isAdminPage && user && (
              <Link
                href="/profile"
                onClick={closeDrawer}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton>
                  <ListItemText primary="Mon profil" />
                </ListItemButton>
              </Link>
            )}
          </List>

          {/* Boutons du bas du drawer */}
          <Stack
            spacing={1}
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 2,
            }}
          >
            {sessionControls}
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
