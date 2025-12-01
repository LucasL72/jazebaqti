// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { requireAdminSession, revokeCurrentSession } from "@/lib/admin-session";
import { rejectIfInvalidCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
