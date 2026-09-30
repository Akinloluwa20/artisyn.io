# Testing

Artisyn.io uses [Vitest](https://vitest.dev/) with
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
and [`jsdom`](https://github.com/jsdom/jsdom). The setup is intentionally
lightweight: it needs no browser, no running API, and no wallet extension.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm test` | Run every suite once. |
| `pnpm test:watch` | Re-run touched suites while developing. |
| `pnpm test:coverage` | Run with the coverage floor enforced (used in CI). |
| `pnpm typecheck` | Type-check the project with `tsc --noEmit`. |
| `pnpm lint` | ESLint. |

`pnpm test` must pass locally and in CI without any external services.

## Where tests live

Colocate a test file with the module it covers, using a `*.test.ts` /
`*.test.tsx` suffix:

```text
src/lib/api/client.ts        → src/lib/api/client.test.ts
src/components/auth/role-guard.tsx
                             → src/components/auth/role-guard.test.tsx
```

Test files are picked up by the `src/**/*.{test,spec}.{ts,tsx}` glob in
`vitest.config.mts`. They are also type-checked, so keep them well typed.

## Conventions

### Prefer request-level mocks over implementation mocks

Exercise the real module under test and stub only the boundary it talks to.
For anything that goes through the API client, stub the global `fetch` and
assert on the URL, method, and body:

```ts
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

fetchMock.mockResolvedValueOnce(
  new Response(JSON.stringify({ id: "1" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
);

await createApplication({ jobTitle: "Fix sink", applicant: "Ada" });

const [url, init] = fetchMock.mock.calls[0];
expect(url).toBe("/api/applications");
expect(init.method).toBe("POST");
```

Avoid mocking `@/lib/api` itself in feature tests — that hides the request
that regressions most often break.

### Keep tests deterministic

- **No live API.** Always stub `fetch`; never hit a real backend.
- **No live wallets.** Stub `@/lib/stellar-wallets-kit` with a fake kit
  (`connect`, `getAddress`, `openModal`, `disconnect`).
- **No wall-clock timing.** Use `vi.useFakeTimers()` and
  `vi.advanceTimersByTimeAsync(...)` instead of real delays.
- **No Next runtime.** `next/image` is stubbed globally in
  `src/test/setup.ts`; mock `next/navigation` per suite when a component uses
  `useRouter` (see `src/components/auth/*.test.tsx`).

### Cover the critical paths

The coverage floor in `vitest.config.mts` is scoped to the shared modules
where regressions are most costly:

- the shared API client (`src/lib/api/client.ts`) and its normalized errors,
- auth and role guards across loading / authorized / unauthorized /
  expired-session states,
- the wallet provider (rejection, cancellation, timeout, safe disconnect),
- onboarding persistence, and
- the shared form-submission lifecycle.

When you add behaviour to one of these modules, add a regression test with it.
New critical modules should be added to `coverage.include` and the floor raised
only as real coverage grows.

## Writing a component test

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

it("renders the guarded content for an allowed role", () => {
  render(
    <AuthProvider>
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>
    </AuthProvider>,
  );

  expect(screen.getByText("Artisan only")).toBeInTheDocument();
});
```

`src/test/setup.ts` loads the `jest-dom` matchers (`toBeInTheDocument`,
`toHaveTextContent`, …) and polyfills the browser APIs jsdom lacks
(`ResizeObserver`, `matchMedia`, pointer capture), so you rarely need to set
these up yourself.

## Continuous integration

`.github/workflows/frontend.yml` runs `pnpm lint`, `pnpm typecheck`,
`pnpm test:coverage`, and `pnpm build` on every pull request to `main`. A pull
request should not be merged while any of these fail.
