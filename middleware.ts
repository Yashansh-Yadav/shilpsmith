import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_API_PREFIX = "/api/admin";
const ADMIN_UI_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // NextAuth's own routes must always pass through.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isAdminApi = pathname.startsWith(ADMIN_API_PREFIX);
  const isAdminUi = pathname === ADMIN_UI_PREFIX || pathname.startsWith(`${ADMIN_UI_PREFIX}/`);

  if (!isAdminApi && !isAdminUi) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin-login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

// Match admin UI + admin APIs only; exclude the upload route so unauthenticated
// uploads keep failing only via the surrounding admin UI gate, not by middleware
// redirect (admin form posts FormData via fetch and shouldn't get HTML back).
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
