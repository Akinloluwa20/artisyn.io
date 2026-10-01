"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipStatus = "completed" | "pending" | "failed" | "refunded";

export type TipViewMode = "sent" | "received";

export interface TipRecord {
  id: string;
  amount: string;
  currency: string;
  /** Display name of the person who sent the tip. */
  senderName: string;
  /** Display name of the person who received the tip. */
  recipientName: string;
  status: TipStatus;
  /** ISO 8601 date string or Date object. */
  createdAt: string | Date;
  /** Optional tip message. */
  message?: string;
}

export interface TipHistoryListProps {
  tips: TipRecord[] | undefined;
  /** Controls which view is active. Defaults to "sent". */
  mode?: TipViewMode;
  /** Callback when the user switches between sent/received tabs. */
  onModeChange?: (mode: TipViewMode) => void;
  isLoading?: boolean;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const tipStatusLabels: Record<TipStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const tipStatusStyles: Record<TipStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  refunded: "border-slate-200 bg-slate-50 text-slate-600",
};

const tipStatusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-medium tracking-normal",
  {
    variants: {
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-xs",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface TipStatusBadgeProps
  extends ComponentPropsWithoutRef<"span">,
    VariantProps<typeof tipStatusBadgeVariants> {
  status: TipStatus;
}

function TipStatusBadge({ status, size, className, ...props }: TipStatusBadgeProps) {
  return (
    <span
      className={cn(tipStatusBadgeVariants({ size }), tipStatusStyles[status], className)}
      {...props}
    >
      {tipStatusLabels[status]}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TipCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-200" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
          <div className="ml-auto h-5 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

// ─── Row card ─────────────────────────────────────────────────────────────────

interface TipCardProps {
  tip: TipRecord;
  mode: TipViewMode;
}

function TipCard({ tip, mode }: TipCardProps) {
  const isSent = mode === "sent";
  const counterpartyName = isSent ? tip.recipientName : tip.senderName;
  const amountSign = isSent ? "-" : "+";
  const amountColor = isSent ? "text-slate-900" : "text-emerald-600";
  const DirectionIcon = isSent ? ArrowUpRight : ArrowDownLeft;
  const directionLabel = isSent ? "Sent to" : "Received from";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/50">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
        >
          {initials(counterpartyName)}
        </div>

        {/* Counterparty + date */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <DirectionIcon
              aria-hidden="true"
              className={cn("h-3.5 w-3.5 shrink-0", isSent ? "text-slate-400" : "text-emerald-500")}
            />
            <span className="text-xs text-slate-500">{directionLabel}</span>
          </div>
          <div className="truncate text-sm font-medium text-slate-900">{counterpartyName}</div>
          <time
            dateTime={tip.createdAt instanceof Date ? tip.createdAt.toISOString() : tip.createdAt}
            className="text-xs text-slate-400"
          >
            {formatDate(tip.createdAt)}
          </time>
        </div>

        {/* Amount + status */}
        <div className="shrink-0 text-right">
          <div className={cn("text-sm font-semibold tabular-nums", amountColor)}>
            {amountSign}
            {tip.amount} {tip.currency}
          </div>
          <div className="mt-1">
            <TipStatusBadge status={tip.status} size="sm" />
          </div>
        </div>
      </div>

      {/* Optional message */}
      {tip.message && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500 italic">
          &ldquo;{tip.message}&rdquo;
        </p>
      )}
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 50;

/**
 * TipHistoryList — reusable list component for sent and received tips.
 *
 * Supports:
 * - Sent / received view mode toggle (controlled or uncontrolled)
 * - Client-side pagination
 * - Loading skeleton state
 * - Empty state
 */
export function TipHistoryList({
  tips,
  mode: modeProp,
  onModeChange,
  isLoading = false,
  pageSize = 10,
  className,
  emptyMessage,
}: TipHistoryListProps) {
  const [internalMode, setInternalMode] = useState<TipViewMode>("sent");
  const isControlled = modeProp !== undefined;
  const activeMode = isControlled ? modeProp : internalMode;

  const safePageSize = Math.min(Math.max(pageSize, PAGE_SIZE_MIN), PAGE_SIZE_MAX);
  const items = useMemo(() => tips ?? [], [tips]);

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = clampPage(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * safePageSize;
    return items.slice(start, start + safePageSize);
  }, [currentPage, items, safePageSize]);

  const handleModeChange = (next: TipViewMode) => {
    if (next === activeMode) return;
    setPage(1);
    if (!isControlled) setInternalMode(next);
    onModeChange?.(next);
  };

  const resolvedEmptyMessage =
    emptyMessage ??
    (activeMode === "sent" ? "You have not sent any tips yet." : "You have not received any tips yet.");

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
        <ViewToggle activeMode={activeMode} onModeChange={handleModeChange} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <TipCardSkeleton />
          </div>
        ))}
      </section>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <section className={cn("space-y-3", className)}>
        <ViewToggle activeMode={activeMode} onModeChange={handleModeChange} />
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{resolvedEmptyMessage}</p>
        </div>
      </section>
    );
  }

  // ── Populated list ─────────────────────────────────────────────────────────
  return (
    <section className={cn("space-y-3", className)}>
      <ViewToggle activeMode={activeMode} onModeChange={handleModeChange} />

      <ul className="space-y-2" aria-label={activeMode === "sent" ? "Sent tips" : "Received tips"}>
        {paged.map((tip) => (
          <li key={tip.id}>
            <TipCard tip={tip} mode={activeMode} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav
          aria-label="Tip history pagination"
          className="flex items-center justify-between gap-3 pt-2 text-sm text-slate-600"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage(clampPage(currentPage - 1, totalPages))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            Prev
          </Button>

          <span className="tabular-nums">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage(clampPage(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

interface ViewToggleProps {
  activeMode: TipViewMode;
  onModeChange: (mode: TipViewMode) => void;
}

function ViewToggle({ activeMode, onModeChange }: ViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Tip history view"
      className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
    >
      {(["sent", "received"] as const).map((m) => (
        <button
          key={m}
          role="tab"
          type="button"
          aria-selected={activeMode === m}
          onClick={() => onModeChange(m)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
            activeMode === m
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {m === "sent" ? (
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownLeft aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {m}
        </button>
      ))}
    </div>
  );
}
