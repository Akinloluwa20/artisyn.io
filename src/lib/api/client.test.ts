import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { ApiClientError } from "./errors";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function mockFetchOnce(body: unknown, init: ResponseInit = {}) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      ...init,
    }),
  );
}

function lastCall() {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("apiClient URL construction", () => {
  it("joins the base URL and path", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/things", { baseUrl: "https://api.example.com" });

    const [url] = lastCall();
    expect(url).toBe("https://api.example.com/api/things");
  });

  it("normalizes trailing slashes and missing leading slashes", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("api/things", { baseUrl: "https://api.example.com/" });

    expect(lastCall()[0]).toBe("https://api.example.com/api/things");
  });

  it("leaves absolute http(s) paths untouched", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("https://cdn.example.com/data.json", {
      baseUrl: "https://api.example.com",
    });

    expect(lastCall()[0]).toBe("https://cdn.example.com/data.json");
  });

  it("appends query parameters and skips null/undefined values", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/jobs", {
      baseUrl: "https://api.example.com",
      query: { page: 2, limit: 10, search: "plumber", cursor: null, filter: undefined },
    });

    const url = new URL(lastCall()[0]);
    expect(url.pathname).toBe("/api/jobs");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("search")).toBe("plumber");
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.has("filter")).toBe(false);
  });

  it("does not append an empty query string", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/jobs", {
      baseUrl: "https://api.example.com",
      query: { cursor: undefined },
    });

    expect(lastCall()[0]).toBe("https://api.example.com/api/jobs");
  });

  it("preserves an existing query string when adding params", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/jobs?sort=recent", {
      baseUrl: "https://api.example.com",
      query: { page: 1 },
    });

    expect(lastCall()[0]).toBe("https://api.example.com/api/jobs?sort=recent&page=1");
  });
});

describe("apiClient request construction", () => {
  it("defaults to GET and sends credentials", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/me", { baseUrl: "https://api.example.com" });

    const [url, init] = lastCall();
    expect(url).toBe("https://api.example.com/api/me");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("allows overriding credentials", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.get("/api/public", {
      baseUrl: "https://api.example.com",
      credentials: "omit",
    });

    expect(lastCall()[1].credentials).toBe("omit");
  });

  it("JSON-serializes object bodies and sets Content-Type", async () => {
    mockFetchOnce({ id: "1" });

    await apiClient.post(
      "/api/applications",
      { jobTitle: "Fix sink" },
      { baseUrl: "https://api.example.com" },
    );

    const [, init] = lastCall();
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ jobTitle: "Fix sink" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("does not set a JSON Content-Type for FormData bodies", async () => {
    mockFetchOnce({ ok: true });
    const form = new FormData();
    form.append("file", "data");

    await apiClient.post("/api/upload", form, {
      baseUrl: "https://api.example.com",
    });

    const [, init] = lastCall();
    expect(init.body).toBe(form);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("passes through custom headers and lets them override defaults", async () => {
    mockFetchOnce({ ok: true });

    await apiClient.post(
      "/api/secure",
      { a: 1 },
      {
        baseUrl: "https://api.example.com",
        headers: { Authorization: "Bearer token", "Content-Type": "text/plain" },
      },
    );

    const headers = lastCall()[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token");
    expect(headers["Content-Type"]).toBe("text/plain");
  });

  it("maps put, patch and delete to their HTTP methods", async () => {
    mockFetchOnce({});
    await apiClient.put("/api/x", { a: 1 }, { baseUrl: "https://api.example.com" });
    expect(lastCall()[1].method).toBe("PUT");

    mockFetchOnce({});
    await apiClient.patch("/api/x", { a: 1 }, { baseUrl: "https://api.example.com" });
    expect(lastCall()[1].method).toBe("PATCH");

    mockFetchOnce(undefined);
    await apiClient.delete("/api/x", { baseUrl: "https://api.example.com" });
    expect(lastCall()[1].method).toBe("DELETE");
  });
});

describe("apiClient response handling", () => {
  it("parses JSON responses", async () => {
    mockFetchOnce({ id: "42", name: "Ada" });

    const result = await apiClient.get<{ id: string; name: string }>("/api/me", {
      baseUrl: "https://api.example.com",
    });

    expect(result).toEqual({ id: "42", name: "Ada" });
  });

  it("returns undefined for an empty body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: "No Content" }),
    );

    const result = await apiClient.delete("/api/x", {
      baseUrl: "https://api.example.com",
    });

    expect(result).toBeUndefined();
  });

  it("returns raw text when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("plain text", { status: 200, statusText: "OK" }),
    );

    const result = await apiClient.get<string>("/api/raw", {
      baseUrl: "https://api.example.com",
    });

    expect(result).toBe("plain text");
  });
});

describe("apiClient envelopes", () => {
  it("unwraps `data` when envelope is requested and success is true", async () => {
    mockFetchOnce({ success: true, data: { total: 3 }, message: "ok" });

    const result = await apiClient.get<{ total: number }>("/api/dashboard", {
      baseUrl: "https://api.example.com",
      envelope: true,
    });

    expect(result).toEqual({ total: 3 });
  });

  it("throws a normalized error when an envelope reports success:false", async () => {
    mockFetchOnce({ success: false, message: "Not allowed" });

    await expect(
      apiClient.get("/api/dashboard", {
        baseUrl: "https://api.example.com",
        envelope: true,
      }),
    ).rejects.toMatchObject({
      name: "ApiClientError",
      message: "Not allowed",
    });
  });

  it("returns the raw payload when no envelope is present", async () => {
    mockFetchOnce({ total: 7 });

    const result = await apiClient.get<{ total: number }>("/api/dashboard", {
      baseUrl: "https://api.example.com",
      envelope: true,
    });

    expect(result).toEqual({ total: 7 });
  });
});

describe("apiClient error normalization", () => {
  it("throws ApiClientError with the message from a JSON body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const error = await apiClient
      .get("/api/jobs/404", { baseUrl: "https://api.example.com" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiClientError);
    const apiError = error as ApiClientError;
    expect(apiError.message).toBe("Job not found");
    expect(apiError.status).toBe(404);
    expect(apiError.statusText).toBe("Not Found");
    expect(apiError.isStatus(404)).toBe(true);
    expect(apiError.data).toEqual({ message: "Job not found" });
  });

  it("falls back to the `error` field for the message", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    await expect(
      apiClient.get("/api/me", { baseUrl: "https://api.example.com" }),
    ).rejects.toMatchObject({ message: "Unauthorized", status: 401 });
  });

  it("uses a plain-text error body as the message", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Service unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    await expect(
      apiClient.get("/api/me", { baseUrl: "https://api.example.com" }),
    ).rejects.toMatchObject({ message: "Service unavailable", status: 503 });
  });

  it("ignores an HTML error page and uses the status text", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html><body>Oops</body></html>", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(
      apiClient.get("/api/me", { baseUrl: "https://api.example.com" }),
    ).rejects.toMatchObject({
      message: "Internal Server Error",
      status: 500,
    });
  });
});
