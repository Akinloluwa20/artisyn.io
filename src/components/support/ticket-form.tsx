"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_ACCEPTED_FILE_TYPES,
  DEFAULT_MAX_FILE_SIZE_MB,
  formatFileSize,
} from "@/components/verification/document-uploader";
import { useFormSubmission } from "@/hooks/use-form-submission";
import { cn } from "@/lib/utils";

const MIN_DESCRIPTION_LENGTH = 20;
const BYTES_PER_MB = 1024 * 1024;

export type TicketCategory =
  | "account"
  | "jobs"
  | "payments"
  | "profile"
  | "verification"
  | "technical"
  | "other";

export type TicketSeverity = "low" | "normal" | "high" | "urgent";

export interface TicketCategoryOption {
  value: TicketCategory;
  label: string;
}

export interface TicketSeverityOption {
  value: TicketSeverity;
  label: string;
}

export interface SupportTicketPayload {
  category: TicketCategory;
  severity: TicketSeverity;
  description: string;
  attachments: File[];
}

/** Optional result a host page can return, e.g. a support desk reference. */
export interface SupportTicketResult {
  reference?: string;
}

export const TICKET_CATEGORY_OPTIONS: readonly TicketCategoryOption[] = [
  { value: "account", label: "Account & wallet" },
  { value: "jobs", label: "Jobs & applications" },
  { value: "payments", label: "Payments & earnings" },
  { value: "profile", label: "Profile & portfolio" },
  { value: "verification", label: "Verification" },
  { value: "technical", label: "Technical issue" },
  { value: "other", label: "Something else" },
];

export const TICKET_SEVERITY_OPTIONS: readonly TicketSeverityOption[] = [
  { value: "low", label: "Low — a question or suggestion" },
  { value: "normal", label: "Normal — something is blocking me" },
  { value: "high", label: "High — I cannot work or get paid" },
  { value: "urgent", label: "Urgent — funds or account at risk" },
];

type TicketField = "category" | "description" | "attachments";
type TicketErrors = Partial<Record<TicketField, string>>;

export interface TicketFormProps {
  /** Receives a validated ticket. Throw to surface an error to the user. */
  onSubmit: (ticket: SupportTicketPayload) => Promise<SupportTicketResult | void>;
  categories?: readonly TicketCategoryOption[];
  severities?: readonly TicketSeverityOption[];
  defaultSeverity?: TicketSeverity;
  maxAttachments?: number;
  maxFileSizeMb?: number;
  acceptedFileTypes?: readonly string[];
  submitLabel?: string;
  successMessage?: string;
  /** Surface the form on a dark background, e.g. the `/contact` page. */
  variant?: "light" | "dark";
  onSubmitted?: (ticket: SupportTicketPayload) => void;
  className?: string;
}

const DARK_INPUT =
  "bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500";
// The select dropdown is portalled, so it does not inherit the page surface.
const DARK_CONTENT = "border-gray-700 bg-gray-900 text-white";
const DARK_ITEM = "text-gray-100 focus:bg-[#605DEC] focus:text-white";

/**
 * Reusable support ticket form.
 *
 * Owns only the form's own concerns — field state, client-side validation of
 * the required fields, attachment limits and submit feedback. Transport is the
 * host page's job: it passes `onSubmit` and decides where the ticket goes, so
 * the same component can be embedded in the contact page, the help centre or
 * any future support surface.
 */
export function TicketForm({
  onSubmit,
  categories = TICKET_CATEGORY_OPTIONS,
  severities = TICKET_SEVERITY_OPTIONS,
  defaultSeverity = "normal",
  maxAttachments = 3,
  maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
  submitLabel = "Submit ticket",
  successMessage = "Ticket received. Our support team will reply within 24-48 hours.",
  variant = "light",
  onSubmitted,
  className,
}: TicketFormProps) {
  const isDark = variant === "dark";

  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [severity, setSeverity] = useState<TicketSeverity>(defaultSeverity);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<TicketErrors>({});

  const categoryRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTicketRef = useRef<SupportTicketPayload | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const { status, isPending, error, submit, reset } = useFormSubmission<SupportTicketResult | void>({
    successMessage,
    onSuccess: (result) => {
      const submitted = pendingTicketRef.current;
      pendingTicketRef.current = null;

      setCategory(null);
      setSeverity(defaultSeverity);
      setDescription("");
      setAttachments([]);
      setErrors({});
      setReference(result?.reference ?? null);

      if (submitted) onSubmitted?.(submitted);
    },
  });

  const labelClass = cn("text-sm", isDark ? "text-gray-300" : "text-gray-700");
  const hintClass = cn("text-xs", isDark ? "text-gray-400" : "text-gray-500");
  const errorClass = cn("text-sm", isDark ? "text-red-300" : "text-rose-600");

  const validate = (): TicketErrors => {
    const next: TicketErrors = {};

    if (!category) {
      next.category = "Choose a category so we can route your ticket.";
    }

    // `severity` is pre-set to `defaultSeverity`, so it is always valid.

    const trimmed = description.trim();
    if (trimmed.length === 0) {
      next.description = "Describe what happened so we can help.";
    } else if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      next.description = `Add a little more detail — at least ${MIN_DESCRIPTION_LENGTH} characters.`;
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Move focus to the first field that needs attention.
      if (nextErrors.category) {
        categoryRef.current?.focus();
      } else {
        descriptionRef.current?.focus();
      }
      return;
    }

    const ticket: SupportTicketPayload = {
      category: category as TicketCategory,
      severity,
      description: description.trim(),
      attachments,
    };

    // `onSubmit` may resolve with no value, so success is tracked via
    // `onSuccess` rather than by inspecting the resolved result.
    pendingTicketRef.current = ticket;
    await submit(() => onSubmit(ticket));
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const incoming = Array.from(fileList);
    const nextErrors: TicketErrors = { ...errors };
    const accepted: File[] = [];

    for (const file of incoming) {
      if (attachments.length + accepted.length >= maxAttachments) {
        nextErrors.attachments = `You can attach up to ${maxAttachments} file${maxAttachments === 1 ? "" : "s"}.`;
        break;
      }

      if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(file.type)) {
        nextErrors.attachments = `${file.name} is not a supported file type.`;
        continue;
      }

      if (file.size > maxFileSizeMb * BYTES_PER_MB) {
        nextErrors.attachments = `${file.name} is larger than the ${maxFileSizeMb} MB limit.`;
        continue;
      }

      accepted.push(file);
    }

    setAttachments((current) => [...current, ...accepted]);
    setErrors(nextErrors);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
    setErrors((current) => ({ ...current, attachments: undefined }));
  };

  const acceptedLabel =
    acceptedFileTypes.length === 0
      ? "Any file type"
      : acceptedFileTypes
          .map((type) =>
            type === "application/pdf" ? "PDF" : type.replace("image/", "").toUpperCase(),
          )
          .join(", ");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
    >
      {status === "success" ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            isDark
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-green-200 bg-green-50 text-green-800",
          )}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {successMessage}
            {reference ? (
              <>
                {" "}
                Your reference is{" "}
                <span className="font-medium">{reference}</span> — quote it in any
                follow-up.
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            isDark
              ? "border-red-500/20 bg-red-500/10 text-red-300"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {error} You can try again, or email{" "}
            <a
              href="mailto:support@artisyn.io"
              className="font-medium underline underline-offset-2"
            >
              support@artisyn.io
            </a>
            .
          </span>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="ticket-category" className={labelClass}>
            Category <span aria-hidden="true">*</span>
          </Label>
          <div ref={categoryRef} tabIndex={-1} className="outline-none">
            <Select
              value={category ?? ""}
              onValueChange={(value) => {
                setCategory(value as TicketCategory);
                setErrors((current) => ({ ...current, category: undefined }));
              }}
            >
              <SelectTrigger
                id="ticket-category"
                className={cn(
                  "h-10 w-full",
                  isDark && "border-gray-700 bg-gray-800/50 text-white",
                  errors.category && (isDark ? "border-red-400" : "border-destructive"),
                )}
                aria-invalid={errors.category ? true : undefined}
                aria-describedby={errors.category ? "ticket-category-error" : undefined}
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent className={cn(isDark && DARK_CONTENT)}>
                {categories.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={cn(isDark && DARK_ITEM)}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.category ? (
            <p id="ticket-category-error" className={errorClass}>
              {errors.category}
            </p>
          ) : null}
        </div>

        {/* Severity */}
        <div className="space-y-1.5">
          <Label htmlFor="ticket-severity" className={labelClass}>
            Severity <span aria-hidden="true">*</span>
          </Label>
          <Select
            value={severity}
            onValueChange={(value) => setSeverity(value as TicketSeverity)}
          >
            <SelectTrigger
              id="ticket-severity"
              className={cn("h-10 w-full", isDark && "border-gray-700 bg-gray-800/50 text-white")}
            >
              <SelectValue placeholder="How urgent is this?" />
            </SelectTrigger>
            <SelectContent className={cn(isDark && DARK_CONTENT)}>
              {severities.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={cn(isDark && DARK_ITEM)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="ticket-description" className={labelClass}>
          Description <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          ref={descriptionRef}
          id="ticket-description"
          rows={6}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setErrors((current) => ({ ...current, description: undefined }));
          }}
          placeholder="What happened, what you expected, and any steps we can follow to reproduce it."
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={cn(
            "ticket-description-hint",
            errors.description && "ticket-description-error",
          )}
          className={cn(
            isDark && DARK_INPUT,
            errors.description && (isDark ? "border-red-400" : "border-destructive"),
          )}
        />
        {errors.description ? (
          <p id="ticket-description-error" className={errorClass}>
            {errors.description}
          </p>
        ) : (
          <p id="ticket-description-hint" className={hintClass}>
            At least {MIN_DESCRIPTION_LENGTH} characters. Please do not include your
            wallet seed phrase.
          </p>
        )}
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <Label htmlFor="ticket-attachments" className={labelClass}>
          Attachments
        </Label>
        <p id="ticket-attachments-hint" className={hintClass}>
          Optional. Up to {maxAttachments} file{maxAttachments === 1 ? "" : "s"},{" "}
          {acceptedLabel}, {maxFileSizeMb} MB each. Screenshots help us respond faster.
        </p>
        <Input
          ref={fileInputRef}
          id="ticket-attachments"
          type="file"
          multiple
          accept={acceptedFileTypes.join(",")}
          onChange={(event) => addFiles(event.target.files)}
          aria-describedby="ticket-attachments-hint"
          className={cn("h-10 cursor-pointer file:mr-3", isDark && DARK_INPUT)}
        />
        {errors.attachments ? (
          <p id="ticket-attachments-error" role="alert" className={errorClass}>
            {errors.attachments}
          </p>
        ) : null}

        {attachments.length > 0 ? (
          <ul className="space-y-2">
            {attachments.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-white",
                )}
              >
                <Paperclip
                  className={cn("size-4 shrink-0", isDark ? "text-gray-400" : "text-gray-500")}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isDark ? "text-white" : "text-gray-900",
                    )}
                  >
                    {file.name}
                  </p>
                  <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                    isDark ? "text-gray-400 hover:bg-red-500/10 hover:text-red-300" : "text-gray-500 hover:bg-rose-50 hover:text-rose-600",
                  )}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className={hintClass}>* Required fields</p>
        <div className="flex items-center gap-3">
          {status !== "idle" && !isPending ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setReference(null);
                setErrors({});
              }}
            >
              Dismiss
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isPending}
            className={cn(
              "gap-2",
              isDark && "bg-[#605DEC] text-white hover:bg-[#605DEC]/90",
            )}
          >
            {isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                Sending…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
