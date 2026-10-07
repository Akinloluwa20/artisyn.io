import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, bootstrapSession, useAuth } from "./AuthProvider";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function sessionResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json" },
  });
}

function Probe() {
  const { role, authenticated, address, loading } = useAuth();
  return (
    <div data-testid="probe">
      {`${role ?? "none"}|${authenticated}|${loading}|${address ?? "none"}`}
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
});

/**
 * The provider reads from a module-level session store, so the first test runs
 * against the pristine SSR snapshot (`loading: true`). Later tests drive the
 * store to a resolved state and assert the eventual value.
 */
describe("AuthProvider", () => {
  it("withholds the session while the bootstrap fetch is in flight", async () => {
    let resolveFetch!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("none|false|true|none");

    resolveFetch(
      sessionResponse({ authenticated: true, address: "GARTISAN", role: "artisan" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "artisan|true|false|GARTISAN",
      ),
    );
  });

  it("resolves an authenticated artisan session", async () => {
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: true, address: "GARTISAN", role: "artisan" }),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "artisan|true|false|GARTISAN",
      ),
    );
  });

  it("resolves an authenticated client session", async () => {
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: true, address: "GCLIENT", role: "client" }),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "client|true|false|GCLIENT",
      ),
    );
  });

  it("nulls an unrecognized server role", async () => {
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: true, address: "GADMIN", role: "admin" }),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "none|true|false|GADMIN",
      ),
    );
  });

  it("treats an unauthenticated session as signed out", async () => {
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: false, address: null, role: null }),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("none|false|false|none"),
    );
  });

  it("treats a failed bootstrap request as signed out", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("none|false|false|none"),
    );
  });

  it("drops an expired session and returns to signed out", async () => {
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: true, address: "GARTISAN", role: "artisan" }),
    );

    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "artisan|true|false|GARTISAN",
      ),
    );

    // The cookie expires and the next bootstrap resolves signed out.
    fetchMock.mockResolvedValue(
      sessionResponse({ authenticated: false, address: null, role: null }),
    );

    await act(async () => {
      await bootstrapSession();
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("none|false|false|none");
  });

  it("throws when useAuth is used outside the provider", () => {
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
