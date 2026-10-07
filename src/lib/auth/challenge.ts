/**
 * Challenge construction shared by the API routes and the client login flow,
 * so the signed message can never drift between the two sides.
 */

export const CHALLENGE_COOKIE = "artisyn_challenge";
export const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

/** The exact message the wallet must sign, bound to the server nonce. */
export function challengeMessage(address: string, nonce: string): string {
  return `artisyn.io session for ${address} nonce ${nonce}`;
}

/** Serialized cookie value: `{address}.{nonce}.{expiresAt}` (plain, server-side only). */
export function buildChallengeCookieValue(
  address: string,
  nonce: string,
  nowSeconds: number,
): string {
  return `${address}.${nonce}.${nowSeconds + CHALLENGE_TTL_SECONDS}`;
}

export interface ParsedChallenge {
  address: string;
  nonce: string;
  expires: number;
}

export function parseChallengeCookie(
  raw: string | undefined,
  nowSeconds: number,
): ParsedChallenge | null {
  if (!raw) return null;
  const [address, nonce, expRaw] = raw.split(".");
  const expires = Number.parseInt(expRaw ?? "", 10);
  if (!address || !nonce || Number.isNaN(expires)) return null;
  if (expires < nowSeconds) return null;
  return { address, nonce, expires };
}
