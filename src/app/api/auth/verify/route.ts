import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Keypair } from "@stellar/stellar-sdk";

import { COOKIE_NAME, signSession, type Role } from "@/lib/auth/session";
import {
  CHALLENGE_COOKIE,
  challengeMessage,
  parseChallengeCookie,
} from "@/lib/auth/challenge";
import { assignUserRole, getUserRole } from "@/lib/auth/user-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
  address?: string;
  signature?: string;
  /** Requested account type. Only honored for brand-new accounts. */
  accountType?: string;
}

/**
 * Wallet-session exchange: prove control of the address with a valid signature
 * over the server nonce, then mint the httpOnly session cookie.
 *
 * Until this succeeds there is no session at all — a merely "connected" wallet
 * grants nothing, and the role comes from the server-side store, never the
 * client.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const bound = parseChallengeCookie(
    cookieStore.get(CHALLENGE_COOKIE)?.value,
    now,
  );
  if (!bound) {
    return NextResponse.json(
      { error: "Challenge missing or expired. Request one from /api/auth/challenge first." },
      { status: 401 },
    );
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address, signature } = body;
  if (!address || !signature) {
    return NextResponse.json(
      { error: "address and signature are required" },
      { status: 400 },
    );
  }
  if (address !== bound.address) {
    return NextResponse.json(
      { error: "Address does not match the issued challenge" },
      { status: 403 },
    );
  }

  try {
    const kp = Keypair.fromPublicKey(address);
    const messageBytes = Buffer.from(
      challengeMessage(address, bound.nonce),
      "utf8",
    );
    const sigBytes = Buffer.from(signature, "base64");
    if (sigBytes.length !== 64 || !kp.verify(messageBytes, sigBytes)) {
      throw new Error("bad signature");
    }
  } catch {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 },
    );
  }

  // Consume the challenge (one-time use) before minting anything.
  cookieStore.delete(CHALLENGE_COOKIE);

  // Resolve the server-owned role. New accounts may claim their onboarding
  // choice exactly once; existing accounts keep the server's record — the
  // client cannot pick or switch its role afterwards.
  let role: Role | null = await getUserRole(address);
  if (!role) {
    const requested = body.accountType;
    if (requested === "artisan" || requested === "client") {
      const result = await assignUserRole(address, requested);
      role = result.ok ? requested : result.current;
    }
  }

  if (!role) {
    return NextResponse.json(
      {
        error:
          "Account type required. Send accountType ('artisan' | 'client') for a new account.",
        code: "account_type_required",
      },
      { status: 400 },
    );
  }

  const token = await signSession({ sub: address, role });
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ authenticated: true, address, role });
}
