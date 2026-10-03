import { defineConfig, configDefaults } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Auth tests use `node:test` (run via `tsx --test`, see package.json
    // test:auth:unit) and are not vitest suites.
    exclude: [...configDefaults.exclude, "src/lib/auth/**"],
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      {
        // The real kit pulls in browser wallet SDKs that do not load in a node
        // test environment. The stub mirrors the 1.9.5 surface we depend on.
        find: "@creit.tech/stellar-wallets-kit",
        replacement: fileURLToPath(
          new URL("./test/stubs/stellar-wallets-kit.ts", import.meta.url),
        ),
      },
    ],
  },
});
