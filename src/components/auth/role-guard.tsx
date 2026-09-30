"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Role } from "@/context/AuthProvider";
import { dashboardRouteForRole } from "@/lib/navigation";

interface RoleGuardProps {
  /** Roles permitted to view the guarded content. */
  allowedRoles: Role[];
  children: ReactNode;
  /** Explicit redirect for unauthorized users; defaults to role-appropriate home. */
  redirectTo?: string;
}

/**
 * Restricts access to its children to the provided `allowedRoles`.
 *
 * The role is server-issued (see `/api/auth/session`) and never consulted from
 * localStorage. While the session is hydrating a loader is shown (no redirect
 * flash); unauthenticated users resolve to the public home; authenticated users
 * whose server role is not permitted are redirected to their own role home.
 */
export function RoleGuard({ allowedRoles, children, redirectTo }: RoleGuardProps) {
  const { role, authenticated, loading } = useAuth();
  const router = useRouter();

  const authorized =
    authenticated && !loading && role !== null && allowedRoles.includes(role);

  useEffect(() => {
    if (!loading && !authorized) {
      router.replace(redirectTo ?? dashboardRouteForRole(role));
    }
  }, [loading, authorized, role, redirectTo, router]);

  if (loading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        {loading || role === null ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  return <>{children}</>;
}
