/**
 * Earnings API service
 * Fetches payout history and tip history for the authenticated artisan.
 */

import { apiClient } from "./client";

// ─── Shared primitives ────────────────────────────────────────────────────────

export type TransactionStatus = "completed" | "pending" | "failed";

export type TransactionType = "payout" | "tip";

export type EarningsPeriod = "7d" | "30d" | "90d" | "all";

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface EarningsSummary {
  totalEarnings: string;
  totalPayouts: string;
  totalTips: string;
  pendingPayouts: string;
  transactionCount: number;
  periodLabel: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface PayoutTransaction {
  id: string;
  type: "payout";
  jobTitle: string;
  clientName: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
}

export interface TipTransaction {
  id: string;
  type: "tip";
  senderName: string;
  message?: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
}

export type EarningsTransaction = PayoutTransaction | TipTransaction;

// ─── API response shapes ──────────────────────────────────────────────────────

export interface EarningsSummaryResponse {
  summary: EarningsSummary;
}

export interface EarningsTransactionsResponse {
  transactions: EarningsTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface EarningsQueryParams {
  period?: EarningsPeriod;
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  page?: number;
  pageSize?: number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Fetches the earnings summary (totals) for the authenticated artisan.
 */
export async function fetchEarningsSummary(
  period: EarningsPeriod = "all"
): Promise<EarningsSummary> {
  return apiClient.get<EarningsSummary>("/api/artisan/earnings/summary", {
    baseUrl: BASE_URL,
    cache: "no-store",
    envelope: true,
    query: { period },
  });
}

/**
 * Fetches the paginated transaction list (payouts + tips) for the authenticated artisan.
 */
export async function fetchEarningsTransactions(
  params: EarningsQueryParams = {}
): Promise<EarningsTransactionsResponse> {
  const { period = "all", type = "all", status = "all", page = 1, pageSize = 10 } = params;
  return apiClient.get<EarningsTransactionsResponse>(
    "/api/artisan/earnings/transactions",
    {
      baseUrl: BASE_URL,
      cache: "no-store",
      envelope: true,
      query: {
        ...(period !== "all" && { period }),
        ...(type !== "all" && { type }),
        ...(status !== "all" && { status }),
        page,
        pageSize,
      },
    }
  );
}
