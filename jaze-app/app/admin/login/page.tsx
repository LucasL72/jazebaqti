"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/albums";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordPolicy =
    "12+ caractères, avec majuscules, minuscules, chiffres et caractère spécial";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur de connexion");
        return;
      }

      router.push(callbackUrl || "/admin/albums");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        sx={{
          maxWidth: 400,
          width: "100%",
          p: 3,
        }}
        elevation={3}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Accès admin
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Espace réservé pour gérer les albums de Jaze Baqti.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <TextField
              label="Mot de passe"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <TextField
              label="Code TOTP (2FA)"
              type="text"
              inputMode="numeric"
              fullWidth
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              helperText="Code généré par votre application d'authentification"
            />

            <Typography variant="caption" color="text.secondary">
              Politique mot de passe : {passwordPolicy}
            </Typography>

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
