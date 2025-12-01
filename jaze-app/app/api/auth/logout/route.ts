import { NextResponse } from "next/server";
import { rejectIfInvalidCsrf } from "@/lib/csrf";
import { revokeUserSession } from "@/lib/user-session";

export async function POST(req: Request) {
  const csrfRejected = rejectIfInvalidCsrf(req);
  if (csrfRejected) return csrfRejected;

  await revokeUserSession();
  return NextResponse.json({ ok: true });
}
