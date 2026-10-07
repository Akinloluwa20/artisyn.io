import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Invalidate the server session. The cookie is cleared so guards hydrate to
 *  `unauthenticated` immediately. */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
