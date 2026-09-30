import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { OnboardingProvider, useOnboarding } from "./onboarding-context";

const STORAGE_KEY = "artisan-onboarding-state";

let ctx: ReturnType<typeof useOnboarding>;

function Probe() {
  ctx = useOnboarding();
  return (
    <div>
      <span data-testid="accountType">{ctx.accountType ?? "none"}</span>
      <span data-testid="hydrated">{String(ctx.isHydrated)}</span>
      <span data-testid="completed">{String(ctx.completed)}</span>
      <span data-testid="name">{ctx.artisanData.fullName || "empty"}</span>
      <span data-testid="clientName">{ctx.clientData.fullName || "empty"}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <OnboardingProvider>
      <Probe />
    </OnboardingProvider>,
  );
}

function persisted() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("OnboardingProvider", () => {
  it("starts empty and reports hydration", () => {
    renderProvider();

    expect(screen.getByTestId("accountType")).toHaveTextContent("none");
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
  });

  it("persists the selected account type", () => {
    renderProvider();

    act(() => {
      ctx.setAccountType("artisan");
    });

    expect(screen.getByTestId("accountType")).toHaveTextContent("artisan");
    expect(persisted().accountType).toBe("artisan");
  });

  it("restores a previously persisted session", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accountType: "client",
        artisanData: { fullName: "Ada" },
        clientData: { fullName: "Grace" },
        completed: false,
      }),
    );

    renderProvider();

    expect(screen.getByTestId("accountType")).toHaveTextContent("client");
    expect(screen.getByTestId("name")).toHaveTextContent("Ada");
    expect(screen.getByTestId("clientName")).toHaveTextContent("Grace");
  });

  it("merges partial artisan updates and strips the profile image", () => {
    renderProvider();
    const image = new File(["x"], "avatar.png", { type: "image/png" });

    act(() => {
      ctx.setArtisanData({ fullName: "Ada", profileImage: image });
      ctx.setArtisanData({ city: "Lagos" });
    });

    expect(ctx.artisanData.fullName).toBe("Ada");
    expect(ctx.artisanData.city).toBe("Lagos");
    expect(persisted().artisanData.profileImage).toBeNull();
  });

  it("merges partial client updates", () => {
    renderProvider();

    act(() => {
      ctx.setClientData({ fullName: "Grace", city: "Abuja" });
    });

    expect(screen.getByTestId("clientName")).toHaveTextContent("Grace");
    expect(persisted().clientData.city).toBe("Abuja");
  });

  it("completes onboarding and clears form data", () => {
    renderProvider();

    act(() => {
      ctx.setAccountType("artisan");
      ctx.setArtisanData({ fullName: "Ada" });
    });

    act(() => {
      ctx.completeOnboarding();
    });

    expect(screen.getByTestId("completed")).toHaveTextContent("true");
    expect(ctx.artisanData.fullName).toBe("");
    expect(persisted().completed).toBe(true);
  });

  it("resets onboarding and removes the stored state", () => {
    renderProvider();

    act(() => {
      ctx.setAccountType("client");
      ctx.setClientData({ fullName: "Grace" });
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => {
      ctx.resetOnboarding();
    });

    expect(screen.getByTestId("accountType")).toHaveTextContent("none");
    expect(screen.getByTestId("completed")).toHaveTextContent("false");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to defaults for corrupt stored state", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    renderProvider();

    expect(screen.getByTestId("accountType")).toHaveTextContent("none");
    expect(screen.getByTestId("completed")).toHaveTextContent("false");
  });

  it("throws when useOnboarding is used outside the provider", () => {
    expect(() => render(<Probe />)).toThrow(
      "useOnboarding must be used within an OnboardingProvider",
    );
  });
});
