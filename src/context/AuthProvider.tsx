"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Role, Session } from "@/lib/auth/session";

export interface AuthState {
  authenticated: boolean;
  role: Role | null;
  address: string | null;
  /** true until the first session bootstrap fetch resolves. */
  loading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

type Listener = () => void;

interface Snapshot {
  loading: boolean;
  authenticated: boolean;
  role: Role | null;
  address: string | null;
}

const UNAUTHENTICATED: Snapshot = {
  loading: false,
  authenticated: false,
  role: null,
  address: null,
};

/**
 * Stable snapshot during SSR / hydration. Module-level constant so React's
 * `useSyncExternalStore` snapshot-identity check never loops. Protected
 * surfaces cannot render before the server session is known.
 */
const SERVER_SNAPSHOT: Snapshot = {
  loading: true,
  authenticated: false,
  role: null,
  address: null,
};

// In-memory external store, mutated only by the bootstrap fetch below. The
// previous implementation read `artisan-onboarding-state` from localStorage —
// editable by anyone — this one reads the server-validated session only.
let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<Listener>();
let bootstrapInFlight: Promise<Snapshot> | null = null;

function replace(next: Snapshot): void {
  snapshot = next;
  for (const l of listeners) l();
}

function subscribe(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Fetch the current session from the server and publish it into the store.
 * Concurrent callers share one in-flight request. On any failure the state is
 * `unauthenticated` — an error never grants access.
 */
export function bootstrapSession(): Promise<Snapshot> {
  if (typeof window === "undefined") return Promise.resolve(SERVER_SNAPSHOT);
  if (bootstrapInFlight) return bootstrapInFlight;
  bootstrapInFlight = (async () => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) throw new Error(`session bootstrap failed (${res.status})`);
      const body = (await res.json()) as {
        authenticated: boolean;
        address: string | null;
        role: string | null;
      };
      const next: Snapshot = body.authenticated
        ? {
            loading: false,
            authenticated: true,
            role:
              body.role === "artisan" || body.role === "client"
                ? body.role
                : null,
            address: body.address ?? null,
          }
        : UNAUTHENTICATED;
      replace(next);
      return next;
    } catch {
      replace(UNAUTHENTICATED);
      return snapshot;
    } finally {
      bootstrapInFlight = null;
    }
  })();
  return bootstrapInFlight;
}

const getClientSnapshot = (): Snapshot => snapshot;

/**
 * Provides auth state sourced ONLY from the server-validated session cookie
 * (`/api/auth/session`). Browser storage is never consulted for authorization;
 * onboarding progress stays a client-side hint.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    // Hydrate on mount; guard components block protected content while
    // `loading` is true, so there is no protected-content flash.
    void bootstrapSession();
  }, []);

  const value: AuthState = {
    authenticated: state.authenticated,
    role: state.role,
    address: state.address,
    loading: state.loading,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export type { Session, Role };
