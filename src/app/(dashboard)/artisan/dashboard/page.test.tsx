import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ArtisanDashboard from "./page";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

const METRICS = {
  totalEarnings: "₦120,000.00",
  activeJobs: 2,
  completedJobs: 12,
  averageRating: 4.5,
  profileViews: 124,
  searchAppearances: "1.2k",
  clientSaves: 18,
  proposalResponseRate: 95,
  artisanName: "Ada",
};

function metricsResponse() {
  return new Response(JSON.stringify({ success: true, data: METRICS }), {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("ArtisanDashboard", () => {
  it("loads and renders metrics from the API", async () => {
    fetchMock.mockResolvedValueOnce(metricsResponse());

    render(<ArtisanDashboard />);

    expect(await screen.findByText(/Welcome back, Ada/)).toBeInTheDocument();
    expect(screen.getByText("₦120,000.00")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/artisan/dashboard/metrics");
  });

  it("surfaces a normalized error and recovers on retry", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Metrics are unavailable" }), {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(metricsResponse());

    render(<ArtisanDashboard />);

    expect(
      await screen.findByText("Could not load dashboard metrics"),
    ).toBeInTheDocument();
    expect(screen.getByText("Metrics are unavailable")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("₦120,000.00")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
