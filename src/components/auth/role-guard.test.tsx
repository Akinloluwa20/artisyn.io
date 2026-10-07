import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoleGuard } from "./role-guard";

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

describe("RoleGuard", () => {
  it("shows a loader and does not redirect while the session is loading", () => {
    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Artisan only")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders children for an allowed role", () => {
    setAuth({ authenticated: true, role: "artisan", loading: false });

    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Artisan only")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects an authenticated user to their own role home", () => {
    setAuth({ authenticated: true, role: "client", loading: false });

    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.queryByText("Artisan only")).not.toBeInTheDocument();
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/client/dashboard");
  });

  it("redirects a signed-out user to the public home", () => {
    setAuth({ authenticated: false, role: null, loading: false });

    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("honours an explicit redirect target", () => {
    setAuth({ authenticated: true, role: "client", loading: false });

    render(
      <RoleGuard allowedRoles={["artisan"]} redirectTo="/for-artisans">
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/for-artisans");
  });
});
