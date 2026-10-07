import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoleGuard } from "./role-guard";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  auth: { role: null as "artisan" | "client" | null, isAuthenticated: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));

beforeEach(() => {
  mocks.auth = { role: null, isAuthenticated: false };
  mocks.replace.mockReset();
});

describe("RoleGuard", () => {
  it("shows a loader while the role is unresolved", () => {
    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Artisan only")).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("renders children for an allowed role", () => {
    mocks.auth = { role: "artisan", isAuthenticated: true };

    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Artisan only")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects an authenticated user to their own role home", () => {
    mocks.auth = { role: "client", isAuthenticated: true };

    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(screen.queryByText("Artisan only")).not.toBeInTheDocument();
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/client/dashboard");
  });

  it("redirects an unauthenticated user to the public home", () => {
    render(
      <RoleGuard allowedRoles={["artisan"]}>
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("honours an explicit redirect target", () => {
    mocks.auth = { role: "client", isAuthenticated: true };

    render(
      <RoleGuard allowedRoles={["artisan"]} redirectTo="/for-artisans">
        <div>Artisan only</div>
      </RoleGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/for-artisans");
  });
});
