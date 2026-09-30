import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/context/ToastProvider";
import { apiClient } from "@/lib/api";
import { TicketForm, type SupportTicketPayload } from "./ticket-form";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function renderForm(
  onSubmit: (ticket: SupportTicketPayload) => Promise<{ reference?: string }>,
) {
  return render(
    <ToastProvider>
      <TicketForm onSubmit={onSubmit} />
    </ToastProvider>,
  );
}

async function fillValidTicket() {
  const user = userEvent.setup();

  await user.click(screen.getByRole("combobox", { name: /category/i }));
  await user.click(screen.getByRole("option", { name: /Account & wallet/i }));
  await user.type(
    screen.getByLabelText(/description/i),
    "I cannot connect my wallet after signing in again.",
  );

  return user;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("TicketForm", () => {
  it("validates required fields before submitting", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(
      await screen.findByText(/Choose a category so we can route your ticket/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Describe what happened so we can help/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the ticket through the API client and shows the reference", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ reference: "TKT-42" }), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderForm((ticket) =>
      apiClient.post<{ reference?: string }>("/api/support/tickets", ticket),
    );

    const user = await fillValidTicket();
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/support/tickets");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      category: "account",
      severity: "normal",
      attachments: [],
    });
    expect(body.description).toMatch(/cannot connect my wallet/i);

    expect(await screen.findByText(/TKT-42/)).toBeInTheDocument();
  });

  it("shows the normalized API error when submission fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Ticket service is down" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderForm((ticket) =>
      apiClient.post<{ reference?: string }>("/api/support/tickets", ticket),
    );

    const user = await fillValidTicket();
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    // The message surfaces both in the form alert and the global toast.
    const alerts = await screen.findAllByText(/Ticket service is down/);
    expect(alerts.length).toBeGreaterThan(0);
  });
});
