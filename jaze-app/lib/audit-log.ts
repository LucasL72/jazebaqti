import { AuditLog, AuditSeverity, Role, User } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditAction =
  | "album.create"
  | "album.delete"
  | "media.upload"
  | "role.change"
  | "auth.login.success"
  | "auth.login.failure";

type Actor = Pick<User, "id" | "email" | "name" | "role"> | null | undefined;

type AuditContext = {
  actor?: Actor;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  severity?: AuditSeverity;
  actorEmailOverride?: string | null;
};

function buildActorEmail(context: AuditContext) {
  if (context.actorEmailOverride) return context.actorEmailOverride;
  return context.actor?.email ?? null;
}

function buildActorId(context: AuditContext) {
  return context.actor?.id ?? null;
}

async function sendSlackAlert(text: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Échec de l'envoi de l'alerte Slack", err);
  }
}

async function sendEmailAlert(subject: string, text: string) {
  const to = process.env.AUDIT_ALERT_EMAILS;
  const webhookUrl = process.env.AUDIT_EMAIL_WEBHOOK_URL;
  if (!to || !webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text }),
    });
  } catch (err) {
    console.error("Échec de l'envoi de l'alerte email", err);
  }
}

async function triggerAlerts(entry: AuditLog) {
  if (entry.action === "album.delete") {
    const meta =
      typeof entry.metadata === "object" && entry.metadata
        ? (entry.metadata as Record<string, unknown>)
        : {};
    const tracksDeleted = Number(meta.tracksDeleted ?? 0);
    const albumId = meta.albumId ?? "inconnu";

    if (tracksDeleted >= 5) {
      const text =
        `Suppression massive détectée: album #${albumId} ` +
        `(pistes supprimées: ${tracksDeleted}).`;
      await Promise.all([
        sendSlackAlert(text),
        sendEmailAlert("Alerte suppression massive d'albums", text),
      ]);
    }
  }

  if (entry.action === "auth.login.failure" && entry.actorEmail) {
    const windowStart = new Date(Date.now() - 10 * 60 * 1000);
    const failureCount = await prisma.auditLog.count({
      where: {
        action: "auth.login.failure",
        actorEmail: entry.actorEmail,
        createdAt: { gte: windowStart },
      },
    });

    if (failureCount >= 3 && (failureCount === 3 || failureCount % 5 === 0)) {
      const text =
        `Échecs répétés de connexion pour ${entry.actorEmail}: ${failureCount} ` +
        "tentatives infructueuses sur les 10 dernières minutes.";
      await Promise.all([
        sendSlackAlert(text),
        sendEmailAlert("Alerte échecs répétés de connexion", text),
      ]);
    }
  }
}

export async function logAuditEvent(action: AuditAction, context: AuditContext = {}) {
  const actorEmail = buildActorEmail(context);
  const actorId = buildActorId(context);

  const entry = await prisma.auditLog.create({
    data: {
      action,
      message: context.message ?? null,
      metadata: context.metadata ?? undefined,
      severity: context.severity ?? AuditSeverity.info,
      actorUserId: actorId,
      actorEmail,
    },
  });

  await triggerAlerts(entry);
  return entry;
}

export function formatAuditAction(action: AuditAction) {
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

export function severityLabel(severity: AuditSeverity) {
  switch (severity) {
    case AuditSeverity.critical:
      return "Critique";
    case AuditSeverity.warning:
      return "Alerte";
    default:
      return "Info";
  }
}

export function isElevatedRole(role: Role) {
  return role === Role.admin || role === Role.editor;
}
