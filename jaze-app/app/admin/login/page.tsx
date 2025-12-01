"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCsrfToken } from "@/lib/useCsrfToken";
import { sanitizeTextInput } from "@/lib/sanitizers";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/albums";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { csrfToken, csrfError } = useCsrfToken();

  useEffect(() => {
    if (csrfError) {
      setError(csrfError);
    }
  }, [csrfError]);

  const passwordPolicy =
    "12+ caractères, avec majuscules, minuscules, chiffres et caractère spécial";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!csrfToken) {
      setError("Protection CSRF indisponible. Merci de recharger la page.");
      setLoading(false);
      return;
    }

    const sanitizedEmail = sanitizeTextInput(email).toLowerCase();
    const sanitizedPassword = sanitizeTextInput(password);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword,
        }),
        credentials: "same-origin",
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
