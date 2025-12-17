"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import { useCsrfToken } from "@/lib/useCsrfToken";

type AdminProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  passwordUpdatedAt: string;
};

export function AdminProfileClient() {
  const { csrfToken, refreshCsrfToken } = useCsrfToken();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Erreur de chargement du profil");
      const data = await res.json();
      setProfile(data);
      setEmail(data.email || "");
      setName(data.name || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!csrfToken) {
      setError("Token CSRF manquant");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const payload: Record<string, string> = {};
    if (email !== profile?.email) payload.email = email;
    if (name !== (profile?.name || "")) payload.name = name;
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setError("Aucune modification");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de mise à jour");
        refreshCsrfToken();
        return;
      }

      setProfile(data);
      setSuccess("Profil mis à jour avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Mon profil administrateur
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modifiez vos informations de compte et votre mot de passe.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="h6">Informations du compte</Typography>

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />

            <TextField
              label="Nom"
              fullWidth
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />

            <Divider />

            <Typography variant="h6">Changer le mot de passe</Typography>
            <Typography variant="caption" color="text.secondary">
              Laissez vide si vous ne souhaitez pas changer le mot de passe.
              Dernière modification:{" "}
              {profile?.passwordUpdatedAt
                ? new Date(profile.passwordUpdatedAt).toLocaleDateString("fr-FR")
                : "Inconnue"}
            </Typography>

            <TextField
              label="Mot de passe actuel"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
            />

            <TextField
              label="Nouveau mot de passe"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              helperText="12+ caractères avec majuscules, minuscules, chiffres et caractères spéciaux"
            />

            <TextField
              label="Confirmer le nouveau mot de passe"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ alignSelf: "flex-start" }}
            >
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
