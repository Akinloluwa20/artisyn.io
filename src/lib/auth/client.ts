"use client";

/**
 * Client-side login/logout helpers for the wallet-session exchange.
 *
 * The wallet only proves address ownership; the server decides the role and
 * mints the httpOnly session cookie. A connected wallet with no completed
 * exchange is NOT authenticated.
 */
import { getKit } from "@/lib/stellar-wallets-kit";
import { bootstrapSession } from "@/context/AuthProvider";
import { challengeMessage } from "@/lib/auth/challenge";
import type { Role } from "@/lib/auth/session";

export interface LoginResult {
  authenticated: boolean;
  address: string;
  role: Role | null;
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  let body: unknown = undefined;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  return { ok: res.ok, status: res.status, body: body as T };
}

/**
 * Full login exchange:
 *   1. GET  /api/auth/challenge?address=…  (server issues + binds a nonce)
 *   2. wallet signMessage(challengeMessage(address, nonce))
 *   3. POST /api/auth/verify  { address, signature, accountType }
 *
 * Step 3 is what mints the session cookie. Any failure before it leaves the
 * user unauthenticated.
 */
export async function loginWithWallet(
  address: string,
  accountType?: Role,
): Promise<LoginResult> {
  const challenge = await fetchJson<{
    challenge?: string;
    address?: string;
    error?: string;
  }>(`/api/auth/challenge?address=${encodeURIComponent(address)}`);
  if (!challenge.ok || !challenge.body?.challenge) {
    throw new Error(challenge.body?.error ?? "Could not start the login challenge");
  }
  const nonce = challenge.body.challenge;
  const message = challengeMessage(address, nonce);

  const { signedMessage } = await getKit().signMessage(message, { address });

  const verified = await fetchJson<{
    authenticated?: boolean;
    address?: string;
    role?: Role | null;
    error?: string;
  }>("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature: signedMessage, accountType }),
  });
  if (!verified.ok || !verified.body?.authenticated) {
    throw new Error(verified.body?.error ?? "Signature verification failed");
  }

  // Refresh the in-memory provider snapshot so guards unblock immediately.
  const next = await bootstrapSession();
  return {
    authenticated: next.authenticated,
    address: next.address ?? address,
    role: next.role,
  };
}

/** Revoke the server session and reset the client snapshot. */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  await bootstrapSession();
}
