"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";

interface AuthGuardProps {
  children: ReactNode;
  /** Route unauthenticated users are redirected to. */
  redirectTo?: string;
}

/**
 * Restricts access to its children to users with a validated server session.
 *
 * Authorization is based ONLY on the server-validated session cookie — never on
 * localStorage or a bare wallet connection. While the session is hydrating (the
 * first bootstrap fetch), protected content is withheld so editing browser
 * storage cannot flash a protected surface. Once hydrated, an unauthenticated
 * user is redirected to the wallet-connection flow.
 */
export function AuthGuard({
  children,
  redirectTo = "/connect-wallet",
}: AuthGuardProps) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  const authorized = authenticated && !loading;

  useEffect(() => {
    if (!loading && !authorized) {
      router.replace(redirectTo);
    }
  }, [loading, authorized, redirectTo, router]);

  // Hydration: withhold content pending the server session response.
  if (loading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
