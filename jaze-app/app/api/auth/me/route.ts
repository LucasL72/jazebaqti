import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  });
}
