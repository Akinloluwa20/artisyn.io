import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { getUserRole } from "@/lib/auth/user-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Current-session bootstrap.
 *
 * This is the ONLY authority the UI consults for `isAuthenticated` and `role`.
 * The cookie is httpOnly + HMAC-signed, so it cannot be read or forged from the
 * browser; the role is resolved server-side from the user store.
 *
 * Always 200 with an explicit state so the client can distinguish
 * `loading` (request in flight) from `unauthenticated` (this response).
 */
export async function GET() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      { authenticated: false, address: null, role: null },
      { status: 200 },
    );
  }

  const role = await getUserRole(session.sub);
  return NextResponse.json(
    { authenticated: true, address: session.sub, role },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
