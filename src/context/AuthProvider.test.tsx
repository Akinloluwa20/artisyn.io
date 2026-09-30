import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider, useAuth } from "./AuthProvider";

const STORAGE_KEY = "artisan-onboarding-state";

function RoleProbe() {
  const { role, isAuthenticated } = useAuth();
  return (
    <div data-testid="probe">
      {role ?? "none"}:{String(isAuthenticated)}
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <RoleProbe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("AuthProvider", () => {
  it("resolves to no role while the session is loading (empty storage)", () => {
    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("none:false");
  });

  it("reads the persisted artisan role", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accountType: "artisan" }),
    );

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("artisan:true");
  });

  it("reads the persisted client role", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accountType: "client", completed: true }),
    );

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("client:true");
  });

  it("treats a corrupt session as unauthenticated", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("none:false");
  });

  it("treats an unknown account type as unauthenticated", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accountType: "admin" }),
    );

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("none:false");
  });

  it("clears the role when the session expires in another tab", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accountType: "artisan" }),
    );
    renderProvider();
    expect(screen.getByTestId("probe")).toHaveTextContent("artisan:true");

    act(() => {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("none:false");
  });

  it("picks up a role established in another tab", () => {
    renderProvider();
    expect(screen.getByTestId("probe")).toHaveTextContent("none:false");

    act(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accountType: "client" }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("client:true");
  });

  it("throws when useAuth is used outside the provider", () => {
    expect(() => render(<RoleProbe />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
