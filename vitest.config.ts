import { defineConfig, configDefaults } from "vitest/config";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration.
 *
 * Two projects share one runner:
 *
 * - `node`  — the pure/node suites (API client + services, Stellar config).
 *   The real wallet kit pulls in browser SDKs that do not load under a node
 *   environment, so it is aliased to a lightweight stub (see
 *   `test/stubs/stellar-wallets-kit.ts`). The `node:test` auth suites run via
 *   `tsx --test` and are excluded here.
 * - `jsdom` — the React component/provider suites, with `src/test/setup.ts`
 *   installing jest-dom matchers, deterministic Next stubs and the browser
 *   polyfills Radix/Next expect.
 *
 * Coverage is intentionally scoped to the critical shared modules this stack
 * was introduced to protect (API client and its services, auth/role guards,
 * wallet + onboarding providers, form-submission hook). It is not app-wide
 * yet: the floor reflects the first slice of regression coverage and should be
 * raised (and widened) as more suites land.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    projects: [
      {
        // Inherit plugins/coverage from the root config.
        extends: true,
        resolve: {
          alias: [
            {
              // The real kit pulls in browser wallet SDKs that do not load in a
              // node test environment. The stub mirrors the 1.9.5 surface we
              // depend on.
              find: "@creit.tech/stellar-wallets-kit",
              replacement: fileURLToPath(
                new URL("./test/stubs/stellar-wallets-kit.ts", import.meta.url),
              ),
            },
          ],
        },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          // Auth tests use `node:test` (run via `tsx --test`, see package.json
          // test:auth:unit) and are not vitest suites.
          exclude: [...configDefaults.exclude, "src/lib/auth/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
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
