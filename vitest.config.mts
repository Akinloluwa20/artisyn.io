import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration.
 *
 * - `jsdom` gives component tests a DOM without a browser or live services.
 * - `vite-tsconfig-paths` honours the `@/*` alias from tsconfig.
 * - `src/test/setup.ts` installs jest-dom matchers and the browser polyfills
 *   the app's Radix/Next components expect.
 *
 * Coverage is scoped to the critical shared modules this stack was introduced
 * to protect (API client, auth/role guards, wallet + onboarding providers,
 * form-submission hook). It is intentionally not app-wide yet: the floor
 * reflects the first slice of regression coverage and should be raised (and
 * widened) as more suites land.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/api/client.ts",
        "src/lib/api/errors.ts",
        "src/lib/api/applications.ts",
        "src/lib/api/dashboard.ts",
        "src/lib/api/jobs.ts",
        "src/lib/api/profile.ts",
        "src/lib/api/user.ts",
        "src/lib/navigation.ts",
        "src/context/AuthProvider.tsx",
        "src/context/WalletProvider.tsx",
        "src/components/auth/auth-guard.tsx",
        "src/components/auth/role-guard.tsx",
        "src/components/artisan/onboarding-context.tsx",
        "src/hooks/use-form-submission.ts",
      ],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/**/*.d.ts",
      ],
      // Initial floor for the critical-path slice above. Raise as suites grow.
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70,
      },
    },
  },
});
