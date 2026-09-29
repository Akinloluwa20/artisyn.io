import type { Role } from "@/context/AuthProvider";

/** Post-onboarding dashboard destinations, keyed by user role. */
export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  artisan: "/artisan/dashboard",
  client: "/client/dashboard",
};

/** Public landing route used when a role cannot be determined. */
export const DEFAULT_HOME_ROUTE = "/";

/**
 * Maps a user role to the dashboard route they should land on. Unknown or
 * missing roles fall back to the public home route.
 */
export function dashboardRouteForRole(role: Role | null): string {
  return role ? ROLE_DASHBOARD_ROUTES[role] : DEFAULT_HOME_ROUTE;
}
