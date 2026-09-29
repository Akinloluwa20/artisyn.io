"use client";

import { useState } from "react";
import {
  TrendingUp,
  Wallet,
  Gift,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  ReceiptText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { useEarningsSummary, useEarningsTransactions } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type {
  EarningsPeriod,
  EarningsTransaction,
  TransactionType,
  TransactionStatus,
} from "@/lib/api/earnings";

// ─── Period options ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { label: string; value: EarningsPeriod }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "All time", value: "all" },
];

// ─── Filter options ───────────────────────────────────────────────────────────

const TYPE_OPTIONS: { label: string; value: TransactionType | "all" }[] = [
  { label: "All types", value: "all" },
  { label: "Payouts", value: "payout" },
  { label: "Tips", value: "tip" },
];

const STATUS_OPTIONS: { label: string; value: TransactionStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransactionStatus }) {
  const styles: Record<TransactionStatus, string> = {
    completed: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<TransactionStatus, string> = {
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: "payout" | "tip" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        type === "tip"
          ? "bg-purple-50 text-purple-700 border-purple-200"
          : "bg-indigo-50 text-indigo-700 border-indigo-200"
      )}
    >
      {type === "tip" ? (
        <Gift className="w-3 h-3" aria-hidden="true" />
      ) : (
        <Wallet className="w-3 h-3" aria-hidden="true" />
      )}
      {type === "tip" ? "Tip" : "Payout"}
    </span>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: EarningsTransaction }) {
  const isPayout = tx.type === "payout";

  const title = isPayout
    ? (tx as Extract<EarningsTransaction, { type: "payout" }>).jobTitle
    : `Tip from ${(tx as Extract<EarningsTransaction, { type: "tip" }>).senderName}`;

  const subtitle = isPayout
    ? `From ${(tx as Extract<EarningsTransaction, { type: "payout" }>).clientName}`
    : (tx as Extract<EarningsTransaction, { type: "tip" }>).message ?? "No message";

  const date = new Date(tx.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors">
      {/* Left: icon + details */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg",
            isPayout ? "bg-indigo-50" : "bg-purple-50"
          )}
        >
          {isPayout ? (
            <ArrowUpRight
              className="w-5 h-5 text-indigo-600"
              aria-hidden="true"
            />
          ) : (
            <Gift className="w-5 h-5 text-purple-600" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Right: badges + amount + date */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <TypeBadge type={tx.type} />
          <StatusBadge status={tx.status} />
        </div>
        <p className="text-sm font-semibold text-gray-900">
          {tx.amount} {tx.currency}
        </p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 animate-pulse">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <AlertCircle
        className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          Could not load earnings data
        </p>
        <p className="text-sm text-red-600 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-red-700 hover:text-red-900 underline underline-offset-2 flex-shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyTransactions() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ReceiptText
        className="w-12 h-12 text-gray-300 mb-3"
        aria-hidden="true"
      />
      <p className="text-gray-500 font-medium">No transactions found</p>
      <p className="text-sm text-gray-400 mt-1">
        Try adjusting your filters or check back after completing a job.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [period, setPeriod] = useState<EarningsPeriod>("30d");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    TransactionStatus | "all"
  >("all");

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useEarningsSummary(period);

  const {
    data: txData,
    isLoading: txLoading,
    error: txError,
    refetch: refetchTx,
  } = useEarningsTransactions({
    period,
    type: typeFilter,
    status: statusFilter,
  });

  const transactions = txData?.transactions ?? [];
  const hasError = summaryError || txError;
  const errorMessage =
    (summaryError ?? txError)?.message ?? "An unexpected error occurred.";

  const handleRetry = () => {
    refetchSummary();
    refetchTx();
  };

  return (
    <div className="w-full space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Earnings &amp; Tips
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your payout history and tips received from clients.
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="earnings-period"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            Period
          </label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as EarningsPeriod)}
          >
            <SelectTrigger
              id="earnings-period"
              className="w-40"
              aria-label="Select time period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <ErrorBanner message={errorMessage} onRetry={handleRetry} />
      )}

      {/* Summary cards */}
      <section aria-label="Earnings summary">
        {summaryLoading ? (
          <SummaryCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={
                <TrendingUp
                  className="w-5 h-5 text-indigo-600"
                  aria-hidden="true"
                />
              }
              label="Total Earnings"
              value={summary?.totalEarnings ?? "—"}
            />
            <StatCard
              icon={
                <Wallet
                  className="w-5 h-5 text-blue-600"
                  aria-hidden="true"
                />
              }
              label="Total Payouts"
              value={summary?.totalPayouts ?? "—"}
            />
            <StatCard
              icon={
                <Gift
                  className="w-5 h-5 text-purple-600"
                  aria-hidden="true"
                />
              }
              label="Total Tips"
              value={summary?.totalTips ?? "—"}
            />
            <StatCard
              icon={
                <Clock
                  className="w-5 h-5 text-yellow-600"
                  aria-hidden="true"
                />
              }
              label="Pending Payouts"
              value={summary?.pendingPayouts ?? "—"}
            />
          </div>
        )}
      </section>

      {/* Transaction list */}
      <section aria-label="Transaction history">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* List header + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction History
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Type filter */}
              <Select
                value={typeFilter}
                onValueChange={(v) =>
                  setTypeFilter(v as TransactionType | "all")
                }
              >
                <SelectTrigger
                  className="w-36"
                  aria-label="Filter by transaction type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as TransactionStatus | "all")
                }
              >
                <SelectTrigger
                  className="w-36"
                  aria-label="Filter by transaction status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transaction rows */}
          <div
            className="divide-y divide-gray-200"
            role="list"
            aria-label="Transactions"
          >
            {txLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TransactionRowSkeleton key={i} />
              ))
            ) : transactions.length === 0 ? (
              <EmptyTransactions />
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} role="listitem">
                  <TransactionRow tx={tx} />
                </div>
              ))
            )}
          </div>

          {/* Footer: total count */}
          {!txLoading && transactions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <p className="text-sm text-gray-500">
                Showing {transactions.length}
                {txData?.total != null && txData.total !== transactions.length
                  ? ` of ${txData.total}`
                  : ""}{" "}
                transaction{transactions.length !== 1 ? "s" : ""}
              </p>

              {txData?.total != null &&
                txData.total > transactions.length && (
                  <button
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    disabled
                    aria-disabled="true"
                  >
                    Load more
                  </button>
                )}
            </div>
          )}

          {/* Loading spinner for full-page spinner fallback */}
          {txLoading && (
            <div
              className="flex items-center justify-center py-8"
              aria-live="polite"
              aria-label="Loading transactions"
            >
              <Loader2
                className="w-6 h-6 text-gray-400 animate-spin"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
