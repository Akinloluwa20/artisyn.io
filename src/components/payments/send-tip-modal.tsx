"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFormSubmission } from "@/hooks/use-form-submission";

export interface SendTipPayload {
  amount: string;
  message?: string;
}

export interface SendTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTip: (tip: SendTipPayload) => Promise<void>;
  artisanName?: string;
  currency?: string;
}

const STELLAR_AMOUNT_PATTERN = /^\d+(?:\.\d{1,7})?$/;

function validateAmount(value: string): string | null {
  const amount = value.trim();

  if (!amount) {
    return "Please enter a tip amount.";
  }

  if (!STELLAR_AMOUNT_PATTERN.test(amount)) {
    return "Enter a valid amount with up to 7 decimal places.";
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Tip amount must be greater than 0.";
  }

  return null;
}

export function SendTipModal({
  isOpen,
  onClose,
  onSendTip,
  artisanName,
  currency = "XLM",
}: SendTipModalProps) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    isPending,
    error: submitError,
    submit,
    reset: resetSubmission,
  } = useFormSubmission<true>({
    successMessage: artisanName
      ? `Tip sent to ${artisanName} successfully.`
      : "Tip sent successfully.",
    errorMessage: (error) =>
      error instanceof Error && error.message
        ? error.message
        : "Failed to send tip. Please try again.",
  });

  const resetForm = () => {
    setAmount("");
    setMessage("");
    setValidationError(null);
    resetSubmission();
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amountError = validateAmount(amount);
    if (amountError) {
      setValidationError(amountError);
      return;
    }

    setValidationError(null);
    const normalizedMessage = message.trim();

    const succeeded = await submit(async () => {
      await onSendTip({
        amount: amount.trim(),
        message: normalizedMessage || undefined,
      });
      return true as const;
    });

    if (succeeded) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-tip-title"
        aria-describedby="send-tip-description"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-md text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close send tip modal"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id="send-tip-title" className="mb-2 text-xl font-semibold text-slate-900">
          Send a tip{artisanName ? ` to ${artisanName}` : ""}
        </h2>
        <p id="send-tip-description" className="mb-5 text-sm text-slate-600">
          Reward great work with a direct tip. Add an optional message if you would like.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="tip-amount"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Amount ({currency})
            </label>
            <input
              id="tip-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setValidationError(null);
                resetSubmission();
              }}
              placeholder="0.00"
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "tip-amount-error" : undefined}
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {validationError && (
              <p id="tip-amount-error" className="mt-1 text-sm text-red-600">
                {validationError}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="tip-message"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Message <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="tip-message"
              name="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                resetSubmission();
              }}
              rows={3}
              placeholder="Say thanks for the great work..."
              disabled={isPending}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          {submitError && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send tip"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
