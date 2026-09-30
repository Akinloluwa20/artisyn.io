import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "./auth-guard";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  auth: { role: null as "artisan" | "client" | null, isAuthenticated: false },
  wallet: { connected: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/context/WalletProvider", () => ({
  useWallet: () => mocks.wallet,
}));

beforeEach(() => {
  mocks.auth.role = null;
  mocks.auth.isAuthenticated = false;
  mocks.wallet.connected = false;
  mocks.replace.mockReset();
});

describe("AuthGuard", () => {
  it("renders children when the user has a resolved role", () => {
    mocks.auth = { role: "artisan", isAuthenticated: true };

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders children when only the wallet is connected", () => {
    mocks.auth = { role: null, isAuthenticated: false };
    mocks.wallet.connected = true;

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to connect-wallet", () => {
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
    render(
      <AuthGuard redirectTo="/login">
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/login");
  });

  it("redirects when an expired session drops the user while mounted", () => {
    mocks.auth = { role: "artisan", isAuthenticated: true };
    const { rerender } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );
    expect(mocks.replace).not.toHaveBeenCalled();

    // Session expired: role cleared and wallet disconnected.
    mocks.auth = { role: null, isAuthenticated: false };
    mocks.wallet.connected = false;
    rerender(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith("/connect-wallet");
  });
});
