import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("nexora_session")?.value;
  const session = token ? await decryptSession(token) : null;

  // 1. Protect /app routes -> redirect unauthenticated to /login
  if (pathname.startsWith("/app")) {
    if (!session || !session.userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirect authenticated users away from /login and /signup to /app/dashboard
  if (pathname === "/login" || pathname === "/signup") {
    if (session && session.userId) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/login",
    "/signup",
  ],
};
