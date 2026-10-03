import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

import { signSession, verifySession } from "./session";
import { challengeMessage } from "./challenge";

const DEV_SECRET = "dev-only-secret-do-not-use-in-production-0123456789abcdef";

test("signSession + verifySession round-trip", async () => {
  const token = await signSession({ sub: "GABC", role: "artisan" });
  const s = await verifySession(token);
  assert.equal(s?.authenticated, true);
  assert.equal(s?.sub, "GABC");
  assert.equal(s?.role, "artisan");
  assert.ok(s!.exp > Math.floor(Date.now() / 1000));
});

test("verifySession rejects tampered role", async () => {
  const token = await signSession({ sub: "GABC", role: "client" });
  const [h, b64, sig] = token.split(".");
  const payload = JSON.parse(
    Buffer.from(b64, "base64url").toString("utf8"),
  ) as { role: string };
  payload.role = "artisan";
  const bad = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sig}`;
  const s = await verifySession(bad);
  assert.equal(s, null);
});

test("verifySession rejects expired token", async () => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT", iss: "artisyn.io" }),
  ).toString("base64url");
  const past = Math.floor(Date.now() / 1000) - 10;
  const body = Buffer.from(
    JSON.stringify({ sub: "GABC", role: "artisan", iat: past - 1, exp: past }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", DEV_SECRET)
    .update(`${header}.${body}`)
    .digest()
    .toString("base64url");
  const s = await verifySession(`${header}.${body}.${sig}`);
  assert.equal(s, null);
});

test("verifySession rejects wrong issuer", async () => {
  const payload = await signSession({ sub: "GABC", role: "artisan" });
  const [_, b64, sig] = payload.split(".");
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT", iss: "evil" }),
  ).toString("base64url");
  const s = await verifySession(`${header}.${b64}.${sig}`);
  assert.equal(s, null);
});

test("challengeMessage is deterministic and includes nonce", () => {
  assert.equal(challengeMessage("GABC", "n-123"),
    "artisyn.io session for GABC nonce n-123");
});

test("signature over wrong message fails", async () => {
  const k = Keypair.random();
  const msg = Buffer.from(challengeMessage("GXYZ", "abc"), "utf8");
  const sig = k.sign(msg); // 64-byte raw — same shape Freighter returns base64'd
  const wrong = Buffer.from("tampered message", "utf8");
  assert.equal(k.verify(wrong, sig), false);
});

test("valid signature round-trips with base64 encoding", async () => {
  const k = Keypair.random();
  const msg = Buffer.from(challengeMessage("GXYZ", "abc"), "utf8");
  const sig = k.sign(msg);
  const b64 = sig.toString("base64");
  assert.equal(k.verify(msg, Buffer.from(b64, "base64")), true);
});
