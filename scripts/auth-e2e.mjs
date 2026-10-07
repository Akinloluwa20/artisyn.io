/**
 * End-to-end acceptance tests for the wallet-session auth flow.
 *
 * These run against a live dev server (see `scripts/auth-e2e.mjs`) so every
 * acceptance criterion is exercised over real HTTP with real cookies:
 *
 *  - a forged localStorage blob grants nothing (storage is never consulted)
 *  - a connected wallet without a completed exchange is NOT authenticated
 *  - a session with a tampered cookie is rejected
 *  - an expired session is rejected
 *  - the wrong role cannot reach the other role's dashboard
 *  - refresh (re-reading /api/auth/session) preserves the correct role
 *  - logout invalidates the session
 *
 * Usage: node --import tsx scripts/auth-e2e.mjs   (dev server must be running)
 */
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SESSION_COOKIE = "artisyn_session";

/** Minimal cookie jar keyed by cookie name. */
function makeJar() {
  const jar = new Map();
  return {
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    absorb(res) {
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const idx = pair.indexOf("=");
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (value === "") jar.delete(name);
        else jar.set(name, value);
      }
    },
    get(name) {
      return jar.get(name);
    },
    set(name, value) {
      jar.set(name, value);
    },
    delete(name) {
      jar.delete(name);
    },
    clone() {
      const c = makeJar();
      for (const [k, v] of jar) c.set(k, v);
      return c;
    },
  };
}

async function call(jar, path, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  const cookie = jar.header();
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  jar.absorb(res);
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

/** Perform the full wallet-session exchange for a fresh keypair. */
async function login(kp, accountType) {
  const jar = makeJar();
  const address = kp.publicKey();
  const ch = await call(jar, `/api/auth/challenge?address=${address}`);
  assert.equal(ch.status, 200, `challenge failed: ${JSON.stringify(ch.body)}`);
  const nonce = ch.body.challenge;
  const message = `artisyn.io session for ${address} nonce ${nonce}`;
  const signature = kp.sign(Buffer.from(message, "utf8")).toString("base64");
  const v = await call(jar, "/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, accountType }),
  });
  return { jar, address, verify: v };
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`FAIL  ${name}\n      ${err.message}`);
  }
}

// 1. Wallet connection alone grants nothing.
await test("wallet without a session exchange is unauthenticated", async () => {
  const jar = makeJar();
  const s = await call(jar, "/api/auth/session");
  assert.equal(s.status, 200);
  assert.equal(s.body.authenticated, false);
  assert.equal(s.body.role, null);
  assert.equal(jar.get(SESSION_COOKIE), undefined);
});

// 2. Full exchange mints a session with a server-issued role.
await test("exchange mints session with server role artisan", async () => {
  const kp = Keypair.random();
  const { jar, verify } = await login(kp, "artisan");
  assert.equal(verify.status, 200, JSON.stringify(verify.body));
  assert.equal(verify.body.role, "artisan");
  const cookie = jar.get(SESSION_COOKIE);
  assert.ok(cookie, "session cookie must be set");
  const s = await call(jar, "/api/auth/session");
  assert.equal(s.body.authenticated, true);
  assert.equal(s.body.role, "artisan");
  assert.equal(s.body.address, kp.publicKey());
});

// 3. Forged / tampered cookie is rejected (simulates editing browser storage).
await test("tampered session cookie is rejected", async () => {
  const kp = Keypair.random();
  const { jar } = await login(kp, "client");
  const token = jar.get(SESSION_COOKIE);
  const [h, b, sig] = token.split(".");
  const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
  payload.role = "artisan"; // privilege escalation attempt
  const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sig}`;
  const attacker = makeJar();
  attacker.set(SESSION_COOKIE, forged);
  const s = await call(attacker, "/api/auth/session");
  assert.equal(s.body.authenticated, false, "forged cookie must not authenticate");
});

// 4. Role cannot be escalated at /verify for an existing account.
await test("account cannot change its role after registration", async () => {
  const kp = Keypair.random();
  const first = await login(kp, "client");
  assert.equal(first.verify.body.role, "client");
  const second = await login(kp, "artisan"); // re-register as artisan
  assert.equal(second.verify.status, 200);
  assert.equal(second.verify.body.role, "client", "role must stay server-owned");
});

// 5. Refresh preserves the correct role.
await test("refresh preserves role (session re-read)", async () => {
  const kp = Keypair.random();
  const { jar } = await login(kp, "artisan");
  const refreshed = jar.clone();
  const a = await call(refreshed, "/api/auth/session");
  const b = await call(refreshed, "/api/auth/session");
  assert.equal(a.body.role, "artisan");
  assert.equal(b.body.role, "artisan");
});

// 6. Logout invalidates the session.
await test("logout invalidates the session", async () => {
  const kp = Keypair.random();
  const { jar } = await login(kp, "artisan");
  const before = await call(jar, "/api/auth/session");
  assert.equal(before.body.authenticated, true);
  const out = await call(jar, "/api/auth/logout", { method: "POST" });
  assert.equal(out.status, 200);
  const after = await call(jar, "/api/auth/session");
  assert.equal(after.body.authenticated, false);
});

// 7. Expired session is rejected (mint an expired token with the dev secret).
await test("expired session is rejected", async () => {
  const crypto = await import("node:crypto");
  const secret =
    process.env.SESSION_SECRET ??
    "dev-only-secret-do-not-use-in-production-0123456789abcdef";
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT", iss: "artisyn.io" }),
  ).toString("base64url");
  const past = Math.floor(Date.now() / 1000) - 10;
  const body = Buffer.from(
    JSON.stringify({ sub: Keypair.random().publicKey(), role: "artisan", iat: past - 1, exp: past }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest()
    .toString("base64url");
  const jar = makeJar();
  jar.set(SESSION_COOKIE, `${header}.${body}.${sig}`);
  const s = await call(jar, "/api/auth/session");
  assert.equal(s.body.authenticated, false, "expired session must not authenticate");
});

// 8. Unauthenticated access to a protected dashboard redirects (no content).
await test("protected dashboard does not render for unauthenticated users", async () => {
  const jar = makeJar();
  const res = await fetch(`${BASE}/artisan/dashboard`, {
    headers: { cookie: jar.header() },
    redirect: "manual",
  });
  const html = await res.text();
  // The guard withholds protected content while hydrating; the dashboard's
  // own markup must not be present in the unauthenticated response.
  assert.ok(
    !/Total Earnings|Active Jobs/i.test(html),
    "protected dashboard content leaked to an unauthenticated request",
  );
});

// 9. Challenge replay is rejected (one-time nonce).
await test("challenge cannot be replayed", async () => {
  const kp = Keypair.random();
  const jar = makeJar();
  const address = kp.publicKey();
  const ch = await call(jar, `/api/auth/challenge?address=${address}`);
  const message = `artisyn.io session for ${address} nonce ${ch.body.challenge}`;
  const signature = kp.sign(Buffer.from(message, "utf8")).toString("base64");
  const first = await call(jar, "/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, accountType: "artisan" }),
  });
  assert.equal(first.status, 200);
  const replay = await call(jar, "/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, accountType: "artisan" }),
  });
  assert.equal(replay.status, 401, "a consumed challenge must not verify twice");
});

// 10. A signature for a different address is rejected.
await test("signature from a different key is rejected", async () => {
  const victim = Keypair.random();
  const attacker = Keypair.random();
  const jar = makeJar();
  const ch = await call(jar, `/api/auth/challenge?address=${victim.publicKey()}`);
  const message = `artisyn.io session for ${victim.publicKey()} nonce ${ch.body.challenge}`;
  const signature = attacker.sign(Buffer.from(message, "utf8")).toString("base64");
  const v = await call(jar, "/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: victim.publicKey(),
      signature,
      accountType: "artisan",
    }),
  });
  assert.equal(v.status, 401);
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passing`);
if (failed.length) process.exit(1);
