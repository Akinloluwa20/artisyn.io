"use client";

import { useCallback } from "react";
import {
  fetchEarningsSummary,
  fetchEarningsTransactions,
  type EarningsPeriod,
  type EarningsQueryParams,
  type EarningsSummary,
  type EarningsTransactionsResponse,
} from "@/lib/api/earnings";
import { useQuery } from "./useQuery";
import { type QueryState } from "./types";

/**
 * Fetches the earnings summary for the given period.
 * Re-runs automatically when `period` changes.
 */
export function useEarningsSummary(
  period: EarningsPeriod = "all"
): QueryState<EarningsSummary> {
  const fetcher = useCallback(
    () => fetchEarningsSummary(period),
    [period]
  );
  return useQuery(`earnings-summary-${period}`, fetcher);
}

/**
 * Fetches the paginated earnings transaction list.
 * Re-runs automatically when any query param changes.
 */
export function useEarningsTransactions(
  params: EarningsQueryParams = {}
): QueryState<EarningsTransactionsResponse> {
  const key = `earnings-transactions-${JSON.stringify(params)}`;
  const fetcher = useCallback(
    () => fetchEarningsTransactions(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  return useQuery(key, fetcher);
}
