// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/admin-session";

export async function POST() {
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
