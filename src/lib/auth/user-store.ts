/**
 * Server-owned user role store.
 *
 * The browser is never an authority on a user's role. Roles are read and
 * written here (server-side), keyed by the wallet address that owns the
 * session, so editing localStorage / forging an onboarding blob cannot grant a
 * dashboard.
 *
 * Backed by a small JSON file so dev servers keep state across restarts; swap
 * `getStore` for the real backend client once one exists. A role is assigned
 * once per address, so a client cannot later re-register itself as an artisan.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Role } from "./session";

const STORE_PATH =
  process.env.AUTH_STORE_PATH ?? path.join(process.cwd(), ".data", "users.json");

type Users = Record<string, { role: Role; createdAt: string }>;

// In-process cache; the file is the durable copy.
let cache: Users | null = null;

async function load(): Promise<Users> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Users;
    cache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function persist(users: Users): Promise<void> {
  cache = users;
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch {
    // Read-only filesystem (e.g. some serverless runtimes): keep the in-process
    // copy so the current instance still behaves correctly.
  }
}

export async function getUserRole(address: string): Promise<Role | null> {
  const users = await load();
  return users[address]?.role ?? null;
}

/**
 * Assign a role to an address. Idempotent for the same role; refuses to change
 * an existing role to a different one (privilege escalation guard).
 */
export async function assignUserRole(
  address: string,
  role: Role,
): Promise<{ ok: true } | { ok: false; reason: "role_locked"; current: Role }> {
  const users = await load();
  const existing = users[address];
  if (existing) {
    if (existing.role === role) return { ok: true };
    return { ok: false, reason: "role_locked", current: existing.role };
  }
  users[address] = { role, createdAt: new Date().toISOString() };
  await persist(users);
  return { ok: true };
}

/** Test/ops helper: drop cached state so the next read hits the file. */
export function resetRoleCache(): void {
  cache = null;
}
