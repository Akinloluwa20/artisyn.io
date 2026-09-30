import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/context/ToastProvider";
import { useFormSubmission } from "./use-form-submission";

let api: ReturnType<typeof useFormSubmission<string>>;

interface ProbeProps {
  successMessage?: string;
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (result: string) => void;
  onError?: (error: unknown) => void;
}

function Probe({ successMessage, errorMessage, onSuccess, onError }: ProbeProps) {
  api = useFormSubmission<string>({
    successMessage,
    errorMessage,
    onSuccess,
    onError,
  });
  return (
    <div>
      <span data-testid="status">{api.status}</span>
      <span data-testid="pending">{String(api.isPending)}</span>
      <span data-testid="error">{api.error ?? "none"}</span>
    </div>
  );
}

function renderProbe(props: ProbeProps = {}) {
  return render(
    <ToastProvider>
      <Probe {...props} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe("useFormSubmission", () => {
  it("starts idle", () => {
    renderProbe();

    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.getByTestId("pending")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("runs a successful submission and shows the success toast", async () => {
    const onSuccess = vi.fn();
    renderProbe({ successMessage: "Saved!", onSuccess });

    let result: string | undefined;
    await act(async () => {
      result = await api.submit(async () => "ok");
    });

    expect(result).toBe("ok");
    expect(api.status).toBe("success");
    expect(api.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith("ok");
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("exposes a pending state while the action runs", async () => {
    renderProbe();

    let resolveAction: (value: string) => void = () => {};
    const action = new Promise<string>((resolve) => {
      resolveAction = resolve;
    });

    let submitPromise: Promise<string | undefined>;
    act(() => {
      submitPromise = api.submit(() => action);
    });

    expect(api.isPending).toBe(true);
    expect(screen.getByTestId("status")).toHaveTextContent("pending");

    await act(async () => {
      resolveAction("done");
      await submitPromise;
    });

    expect(api.isPending).toBe(false);
    expect(api.status).toBe("success");
  });

  it("captures a custom error message and fires the error toast", async () => {
    const onError = vi.fn();
    renderProbe({ errorMessage: "Could not save", onError });

    let result: string | undefined;
    await act(async () => {
      result = await api.submit(async () => {
        throw new Error("boom");
      });
    });

    expect(result).toBeUndefined();
    expect(api.status).toBe("error");
    expect(api.error).toBe("Could not save");
    expect(onError).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  it("falls back to the thrown error's message", async () => {
    renderProbe();

    await act(async () => {
      await api.submit(async () => {
        throw new Error("Server exploded");
      });
    });

    expect(api.error).toBe("Server exploded");
  });

  it("uses a generic message for non-Error failures", async () => {
    renderProbe();

    await act(async () => {
      await api.submit(async () => {
        throw "nope";
      });
    });

    expect(api.error).toBe("Something went wrong. Please try again.");
  });

  it("resets status and error", async () => {
    renderProbe();

    await act(async () => {
      await api.submit(async () => {
        throw new Error("boom");
      });
    });
    expect(api.status).toBe("error");

    act(() => {
      api.reset();
    });

    expect(api.status).toBe("idle");
    expect(api.error).toBeNull();
  });
});
