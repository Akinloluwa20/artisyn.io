import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  CHALLENGE_COOKIE,
  CHALLENGE_TTL_SECONDS,
  buildChallengeCookieValue,
} from "@/lib/auth/challenge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issue a one-time login challenge bound (httpOnly cookie) to the claimed
 * wallet address. The address itself is NOT trusted for authorization — it
 * scopes the challenge; `/api/auth/verify` still requires a valid signature
 * over the server nonce.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, buildChallengeCookieValue(address, nonce, now), {
    httpOnly: true,
    path: "/api/auth",
    maxAge: CHALLENGE_TTL_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ challenge: nonce, address });
}
