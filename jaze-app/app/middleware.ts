// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdminPath) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";

  const loggedIn = req.cookies.get("admin_logged_in")?.value === "true";

  if (!loggedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
