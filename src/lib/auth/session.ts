/**
 * Server-validated session layer (Edge + Node compatible, zero extra deps).
 *
 * Authorization never reads browser storage. The only source of truth for
 * `isAuthenticated` / `role` is a cryptographically signed, httpOnly cookie
 * minted by `/api/auth/verify` after a wallet signs the challenge.
 *
 * The token is an HMAC-SHA256 of a JSON payload (header.payload.signature), so
 * any tampering — including hand-editing localStorage to fake a role —
 * invalidates the signature and the session is rejected. `role` is always
 * issued by the server during the challenge/verify exchange.
 *
 * Uses Web Crypto (`globalThis.crypto.subtle`) so the exact same verification
 * runs in Edge middleware and in Node route handlers.
 */
export type Role = "artisan" | "client";

export interface SessionPayload {
  /** Public wallet address that owns this session. */
  sub: string;
  /** Role issued by the server — never trusted from the client. */
  role: Role;
  /** Issued-at (seconds). */
  iat: number;
  /** Absolute expiry (seconds). */
  exp: number;
}

export interface Session extends SessionPayload {
  authenticated: true;
}

const COOKIE_NAME = "artisyn_session";
const ISSUER = "artisyn.io";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Secret used to sign session tokens. In production this MUST be supplied via
 * the `SESSION_SECRET` environment variable (min 32 bytes). When unset we fall
 * back to a dev-only deterministic value so local builds still work, but this
 * fallback is explicitly insecure and must never be used in production.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is required in production to sign auth sessions.",
    );
  }
  return "dev-only-secret-do-not-use-in-production-0123456789abcdef";
}

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array | null {
  try {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Copy encoded bytes into a plain, non-shared ArrayBuffer. `TextEncoder.encode`
 * is typed as `Uint8Array<ArrayBufferLike>` in the Node typings while Web Crypto
 * only accepts `BufferSource` (`ArrayBuffer`-backed views); copying yields a
 * value both agree on without an unsafe cast.
 */
function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(encoder.encode(getSecret())),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmac(input: string): Promise<Uint8Array> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    toBufferSource(encoder.encode(input)),
  );
  return new Uint8Array(sig);
}

/** Constant-time byte comparison (avoids signature timing oracles). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Build a signed session token (`base64url(header).base64url(payload).sig`).
 * The header carries `iss` so verifiers reject tokens minted elsewhere.
 */
export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    sub: payload.sub,
    role: payload.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const header = b64url(
    encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT", iss: ISSUER })),
  );
  const bodyB64 = b64url(encoder.encode(JSON.stringify(body)));
  const sig = b64url(await hmac(`${header}.${bodyB64}`));
  return `${header}.${bodyB64}.${sig}`;
}

/**
 * Verify a session token from the cookie. Returns the validated session or
 * `null` for any malformed / tampered / expired / wrong-issuer token.
 */
export async function verifySession(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;

  let header: unknown;
  let body: unknown;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerB64)!));
    body = JSON.parse(new TextDecoder().decode(b64urlToBytes(bodyB64)!));
  } catch {
    return null;
  }

  const h = header as { alg?: unknown; iss?: unknown };
  if (!h || typeof h !== "object" || h.alg !== "HS256" || h.iss !== ISSUER) {
    return null;
  }

  const providedSig = b64urlToBytes(sigB64);
  if (!providedSig) return null;
  const expectedSig = await hmac(`${headerB64}.${bodyB64}`);
  if (!timingSafeEqual(expectedSig, providedSig)) return null;

  const b = body as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (typeof b.exp !== "number" || b.exp < now) return null;
  if (typeof b.sub !== "string" || b.sub.length === 0) return null;
  const role = b.role as Role | undefined;
  if (role !== "artisan" && role !== "client") return null;

  return {
    authenticated: true,
    sub: b.sub,
    role,
    iat: typeof b.iat === "number" ? b.iat : now,
    exp: b.exp,
  };
}

export { COOKIE_NAME };
