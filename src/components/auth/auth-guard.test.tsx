import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "./auth-guard";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  auth: {
    authenticated: false,
    role: null as "artisan" | "client" | null,
    loading: true,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));

function setAuth(next: {
  authenticated: boolean;
  role: "artisan" | "client" | null;
  loading: boolean;
}) {
  mocks.auth = next;
}

beforeEach(() => {
  setAuth({ authenticated: false, role: null, loading: true });
  mocks.replace.mockReset();
});

describe("AuthGuard", () => {
  it("withholds content and does not redirect while the session is loading", () => {
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders children for an authenticated user", () => {
    setAuth({ authenticated: true, role: "artisan", loading: false });

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to connect-wallet", () => {
    setAuth({ authenticated: false, role: null, loading: false });

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/connect-wallet");
  });

  it("honours a custom redirect target", () => {
    setAuth({ authenticated: false, role: null, loading: false });

    render(
      <AuthGuard redirectTo="/login">
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/login");
  });

  it("redirects when an expired session drops the user while mounted", () => {
    setAuth({ authenticated: true, role: "artisan", loading: false });
    const { rerender } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );
    expect(mocks.replace).not.toHaveBeenCalled();

    // Session expired: the server now resolves the visitor as signed out.
    setAuth({ authenticated: false, role: null, loading: false });
    rerender(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/connect-wallet");
  });
});
