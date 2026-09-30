import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createApplication,
  getApplications,
  updateApplicationStatus,
} from "./applications";
import { fetchDashboardMetrics } from "./dashboard";
import { listJobs } from "./jobs";
import { getProfile, getProfileCompletion, saveProfile } from "./profile";
import { BLOCKLIST_ENDPOINTS, getBlockedUsers, unblockUser } from "./user";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function lastCall() {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("applications API", () => {
  it("lists applications through the shared client", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "1" }]));

    const result = await getApplications();

    expect(result).toEqual([{ id: "1" }]);
    expect(lastCall()[0]).toBe("/api/applications");
    expect(lastCall()[1].method).toBe("GET");
  });

  it("posts a new application as JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "2" }));

    await createApplication({ jobTitle: "Fix sink", applicant: "Ada" });

    const [url, init] = lastCall();
    expect(url).toBe("/api/applications");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({ jobTitle: "Fix sink", applicant: "Ada" }),
    );
  });

  it("patches an application status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "2", status: "accepted" }));

    await updateApplicationStatus("2", "accepted");

    const [url, init] = lastCall();
    expect(url).toBe("/api/applications");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ id: "2", status: "accepted" }));
  });
});

describe("jobs API", () => {
  it("serializes list params into the query string", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ jobs: [], total: 0, page: 2, totalPages: 0 }),
    );

    await listJobs({ page: 2, limit: 20 });

    const url = new URL(lastCall()[0], "http://localhost");
    expect(url.pathname).toBe("/api/jobs");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("20");
  });
});

describe("dashboard API", () => {
  it("unwraps the metrics envelope and bypasses cache", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { totalEarnings: "₦1", activeJobs: 2 },
      }),
    );

    const result = await fetchDashboardMetrics();

    expect(result).toEqual({ totalEarnings: "₦1", activeJobs: 2 });
    expect(lastCall()[0]).toBe("/api/artisan/dashboard/metrics");
    expect(lastCall()[1].cache).toBe("no-store");
  });

  it("propagates a failed envelope as an error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "No metrics yet" }),
    );

    await expect(fetchDashboardMetrics()).rejects.toThrow("No metrics yet");
  });
});

describe("profile API", () => {
  it("loads the profile without caching", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ fullName: "Ada" }));

    const result = await getProfile();

    expect(result).toEqual({ fullName: "Ada" });
    expect(lastCall()[0]).toBe("/api/profile");
    expect(lastCall()[1].cache).toBe("no-store");
  });

  it("saves the profile as JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "p1" }));

    await saveProfile({ fullName: "Ada", city: "Lagos" });

    const [url, init] = lastCall();
    expect(url).toBe("/api/profile");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({ fullName: "Ada", city: "Lagos" }),
    );
  });

  it("loads profile completion and its fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ percentage: 80, fields: [] }));

    const result = await getProfileCompletion();

    expect(result).toEqual({ percentage: 80, fields: [] });
    expect(lastCall()[0]).toBe("/api/profile/completion");
    expect(lastCall()[1].cache).toBe("no-store");
  });
});

describe("user blocklist API", () => {
  it("falls back to the next candidate endpoint", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(jsonResponse([{ id: "u1", name: "Bob" }]));

    const result = await getBlockedUsers();

    expect(result).toEqual([{ id: "u1", name: "Bob" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(BLOCKLIST_ENDPOINTS[0]);
    expect(fetchMock.mock.calls[1][0]).toBe(BLOCKLIST_ENDPOINTS[1]);
  });

  it("throws when every candidate endpoint fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("404"))
      .mockRejectedValueOnce(new Error("404"));

    await expect(getBlockedUsers()).rejects.toThrow("Failed to fetch blocklist");
  });

  it("tries the path variant before the body variant when unblocking", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await unblockUser("u1");

    const [url, init] = lastCall();
    expect(url).toBe("/api/user/privacy/blocklist/u1");
    expect(init.method).toBe("DELETE");
  });

  it("falls back to the body variant for unblock", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await unblockUser("u1");

    const [url, init] = lastCall();
    expect(url).toBe("/api/user/privacy/blocklist");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(JSON.stringify({ userId: "u1" }));
  });
});
