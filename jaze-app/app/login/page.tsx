"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCsrfToken } from "@/lib/useCsrfToken";
import { sanitizeTextInput } from "@/lib/sanitizers";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { csrfToken, csrfError } = useCsrfToken();
  const { user, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (user && !userLoading) {
      router.replace(next);
    }
  }, [user, userLoading, router, next]);

  useEffect(() => {
    if (csrfError) {
      setError(csrfError);
    }
  }, [csrfError]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!csrfToken) {
      setError("Protection CSRF indisponible. Merci de réessayer.");
      return;
    }

    const sanitizedEmail = sanitizeTextInput(email).toLowerCase();
    const sanitizedPassword = sanitizeTextInput(password);
    const sanitizedName = sanitizeTextInput(name);

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword,
          name: sanitizedName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Impossible de finaliser la requête");
        return;
      }

      setSuccess(
        mode === "login"
          ? "Connexion réussie, redirection en cours..."
          : "Compte créé ! Vous êtes connecté."
      );
      router.push(next || "/");
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper sx={{ width: "100%", maxWidth: 480, p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Accédez à vos albums favoris et reprenez la lecture où vous l&apos;aviez laissée.
        </Typography>

        <Tabs
          value={mode}
          onChange={(_, value) => setMode(value)}
          sx={{ mt: 1, mb: 2 }}
        >
          <Tab value="login" label="Se connecter" />
          <Tab value="register" label="Créer un compte" />
        </Tabs>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {mode === "register" && (
              <TextField
                label="Nom (optionnel)"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={mode === "login" ? "username" : "email"}
              required
            />

            <TextField
              label="Mot de passe"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              helperText="12+ caractères, avec majuscules/minuscules/chiffres et caractères spéciaux"
              required
            />

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Button type="submit" variant="contained" disabled={loading || userLoading}>
              {loading ? "Envoi..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
