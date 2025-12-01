"use client";

import { useState } from "react";
import {
  Box,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Alert,
} from "@mui/material";
import { AuditSeverity, Role } from "@prisma/client";

type AuditAction =
  | "album.create"
  | "album.delete"
  | "media.upload"
  | "role.change"
  | "auth.login.success"
  | "auth.login.failure";

type AuditLogRow = {
  id: number;
  action: AuditAction;
  severity: AuditSeverity;
  message: string | null;
  actorEmail: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
};

function formatAction(action: AuditAction) {
  switch (action) {
    case "album.create":
      return "Création d'album";
    case "album.delete":
      return "Suppression d'album";
    case "media.upload":
      return "Upload de média";
    case "role.change":
      return "Changement de rôle";
    case "auth.login.failure":
      return "Échec de connexion";
    case "auth.login.success":
      return "Connexion réussie";
    default:
      return action;
  }
}

function severityColor(severity: AuditSeverity) {
  switch (severity) {
    case AuditSeverity.critical:
      return "error" as const;
    case AuditSeverity.warning:
      return "warning" as const;
    default:
      return "default" as const;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <Typography variant="caption">—</Typography>;
  }

  return (
    <Stack spacing={0.5}>
      {Object.entries(metadata).map(([key, val]) => (
        <Typography key={key} variant="caption" sx={{ wordBreak: "break-word" }}>
          <strong>{key}:</strong> {String(val)}
        </Typography>
      ))}
    </Stack>
  );
}

type Props = {
  logs: AuditLogRow[];
  users: UserRow[];
  slackEnabled: boolean;
  emailEnabled: boolean;
};

export function AuditDashboardClient({
  logs,
  users,
  slackEnabled,
  emailEnabled,
}: Props) {
  const [userRows, setUserRows] = useState(users);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: Role) => {
    setSavingFor(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Mise à jour du rôle impossible");
      }

      setUserRows((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role } : user))
      );
      setSuccessMessage("Rôle mis à jour et journalisé.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setErrorMessage(message);
    } finally {
      setSavingFor(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Journal d&apos;audit & alertes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Les actions sensibles sont enregistrées avec horodatage et utilisateur.
          Les alertes Slack/email se déclenchent automatiquement sur suppression
          massive ou échecs répétés de connexion.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Slack
          </Typography>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <Chip
              label={slackEnabled ? "Webhook configuré" : "Webhook manquant"}
              color={slackEnabled ? "success" : "default"}
              size="small"
            />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Variable SLACK_WEBHOOK_URL
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Email
          </Typography>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <Chip
              label={emailEnabled ? "Webhook email configuré" : "Webhook manquant"}
              color={emailEnabled ? "success" : "default"}
              size="small"
            />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Variables AUDIT_EMAIL_WEBHOOK_URL + AUDIT_ALERT_EMAILS
          </Typography>
        </Paper>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Logs récents ({logs.length})
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Détails</TableCell>
              <TableCell>Quand</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Chip
                    size="small"
                    label={formatAction(log.action)}
                    color={severityColor(log.severity)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {log.actorEmail || "(inconnu)"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {log.message || "—"}
                  </Typography>
                  <MetadataCell metadata={log.metadata} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(log.createdAt)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune entrée d&apos;audit pour le moment.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Gestion des rôles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toute modification de rôle est auditée et peut déclencher une alerte
            si elle élève les privilèges.
          </Typography>

          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Divider />

          <Stack spacing={1}>
            {userRows.map((user) => (
              <Stack
                key={user.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  pb: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">
                    {user.email || user.name || user.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {user.id}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Select
                    size="small"
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value as Role)
                    }
                    disabled={savingFor === user.id}
                  >
                    <MenuItem value={Role.admin}>Admin</MenuItem>
                    <MenuItem value={Role.editor}>Éditeur</MenuItem>
                    <MenuItem value={Role.viewer}>Lecteur</MenuItem>
                  </Select>
                  {savingFor === user.id && (
                    <Typography variant="caption" color="text.secondary">
                      Mise à jour...
                    </Typography>
                  )}
                </Stack>
              </Stack>
            ))}

            {userRows.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucun utilisateur trouvé.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
