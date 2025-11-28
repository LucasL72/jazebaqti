"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  IconButton,
  Drawer,
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
import { ColorModeContext } from "./AppThemeProvider";

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Album", href: "/albums/1" }, // à ajuster si plusieurs albums
];

export function GlobalNav() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const handleToggleDrawer = () => setOpen((prev) => !prev);
  const handleCloseDrawer = () => setOpen(false);

  return (
    <>
      {/* Barre principale (sidebar ou topbar selon la taille d'écran) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "space-between", md: "flex-start" },
          gap: 1.5,
          mb: { xs: 0, md: 3 },
          width: "100%",
        }}
      >
        {/* Logo + nom */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Image
            src="/images/logo-jaze.svg"
            alt="Jaze Baqti Logo"
            width={32}
            height={32}
          />
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Typography variant="h6" fontWeight={700}>
              Jaze Baqti
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Streaming dédié
            </Typography>
          </Box>
        </Stack>

        {/* Zone actions (mode + burger) */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ ml: "auto" }}
        >
          {/* Bouton mode sombre/clair */}
          <IconButton
            onClick={colorMode.toggleColorMode}
            size="small"
            aria-label="Basculer le mode de couleur"
          >
            {theme.palette.mode === "dark" ? (
              <LightModeIcon />
            ) : (
              <DarkModeIcon />
            )}
          </IconButton>

          {/* Burger visible uniquement sur mobile/tablette */}
          <IconButton
            onClick={handleToggleDrawer}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Navigation verticale (desktop) */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          mt: 4,
        }}
      >
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
                sx={{
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {item.label}
              </Typography>
            </Link>
          ))}
        </Stack>
      </Box>

      {/* Drawer mobile / tablette */}
      <Drawer anchor="left" open={open} onClose={handleCloseDrawer}>
        <Box
          sx={{
            width: 260,
            p: 2,
            bgcolor: "background.default",
            height: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Image
                src="/images/logo-jaze.svg"
                alt="Jaze Baqti Logo"
                width={32}
                height={32}
              />
              <Typography variant="h6" fontWeight={700}>
                Jaze Baqti
              </Typography>
            </Stack>

            <IconButton onClick={handleCloseDrawer}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none", color: "inherit" }}
                onClick={handleCloseDrawer}
              >
                <ListItemButton>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </Link>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
