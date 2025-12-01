// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { requireAdminSession, revokeCurrentSession } from "@/lib/admin-session";

export async function POST() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
