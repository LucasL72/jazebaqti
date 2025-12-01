import { prisma } from "@/lib/prisma";
import { GlobalNav } from "@/app/GlobalNav";
import { PlayerBar } from "@/app/PlayerBar";
import { enforceAdminPageAccess } from "@/lib/admin-session";
import { AuditDashboardClient } from "./AuditDashboardClient";
import { AuditAction } from "@/lib/audit-log";
import { AuditSeverity, Role } from "@prisma/client";

export default async function AuditPage() {
  await enforceAdminPageAccess("/admin/audit");

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      orderBy: { email: "asc" },
    }),
  ]);

  const logsForClient = logs.map((log) => ({
    id: log.id,
    action: log.action as AuditAction,
    severity: log.severity as AuditSeverity,
    message: log.message,
    actorEmail: log.actorEmail,
    createdAt: log.createdAt.toISOString(),
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
  }));

  const usersForClient = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  }));

  const slackEnabled = Boolean(process.env.SLACK_WEBHOOK_URL);
  const emailEnabled = Boolean(
    process.env.AUDIT_EMAIL_WEBHOOK_URL && process.env.AUDIT_ALERT_EMAILS
  );

  return (
    <div className="main-shell">
      <aside className="main-shell__sidebar">
        <GlobalNav />
      </aside>

      <main className="main-shell__content">
        <AuditDashboardClient
          logs={logsForClient}
          users={usersForClient}
          slackEnabled={slackEnabled}
          emailEnabled={emailEnabled}
        />
      </main>

      <PlayerBar />
    </div>
  );
}
