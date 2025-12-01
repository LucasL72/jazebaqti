// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "admin_session_token";
type SessionRole = "admin" | "editor" | "viewer";

function readSessionRole(req: NextRequest): SessionRole | null {
  const raw = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [role] = raw.split(":");
  if (role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }

  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  const role = readSessionRole(req);

  if (isAdminApi) {
    if (role !== "admin" && !isLoginApi) {
      return NextResponse.json(
        { error: "Accès administrateur requis" },
        { status: role ? 403 : 401 }
      );
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (role !== "admin") {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
