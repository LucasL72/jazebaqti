// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Admin credentials not configured" },
      { status: 500 }
    );
  }

  if (email === adminEmail && password === adminPassword) {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("admin_logged_in", "true", {
      httpOnly: true,
      path: "/",
      // tu peux ajouter secure: true et sameSite en prod
    });

    return res;
  }

  return NextResponse.json(
    { error: "Identifiants incorrects" },
    { status: 401 }
  );
}
