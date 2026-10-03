import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
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
