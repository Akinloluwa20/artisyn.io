import { NextRequest, NextResponse } from "next/server";

import { COOKIE_NAME, verifySession } from "@/lib/auth/session";

/**
 * Edge authorization gate for dashboard routes.
 *
 * Rejects any request whose session cookie is missing, tampered with, expired
 * or signed with a different key — before the page is rendered, so protected
 * content never reaches an unauthenticated client (client-side guards alone
 * would still ship the RSC payload).
 *
 * Role-to-dashboard matching is enforced per-layout by `RoleGuard`, which is
 * the only place that knows which roles a route admits.
 */
export const config = {
  matcher: ["/artisan/:path*", "/client/:path*", "/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const session = await verifySession(request.cookies.get(COOKIE_NAME)?.value);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/connect-wallet";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
