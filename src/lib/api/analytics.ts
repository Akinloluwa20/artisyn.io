/**
 * Admin Analytics API service.
 * Fetches platform analytics summaries and aggregated trend data.
 */

import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalUsers: number;
  totalArtisans: number;
  totalClients: number;
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  totalRevenue: string;
  averageRating: number;
  newUsersThisPeriod: number;
  newJobsThisPeriod: number;
  userGrowthRate: number;
  jobCompletionRate: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface AnalyticsTrend {
  label: string;
  data: TrendPoint[];
}

export interface AnalyticsAggregation {
  userGrowth: TrendPoint[];
  jobActivity: TrendPoint[];
  revenueOverTime: TrendPoint[];
  registrationsByCategory: { category: string; count: number }[];
}

export interface AnalyticsFilters {
  /** ISO date string – start of range */
  from?: string;
  /** ISO date string – end of range */
  to?: string;
  /** e.g. "registration", "job_posted", "job_completed", "payment" */
  eventType?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Fetches the platform-wide analytics summary KPIs for the given date range.
 */
export async function fetchAnalyticsSummary(
  filters?: AnalyticsFilters,
): Promise<AnalyticsSummary> {
  return apiClient.get<AnalyticsSummary>("/api/admin/analytics/summary", {
    baseUrl: BASE,
    cache: "no-store",
    envelope: true,
    query: {
      from: filters?.from,
      to: filters?.to,
      event_type: filters?.eventType,
    },
  });
}

/**
 * Fetches aggregated trend data (user growth, job activity, revenue) for charts.
 */
export async function fetchAnalyticsAggregation(
  filters?: AnalyticsFilters,
): Promise<AnalyticsAggregation> {
  return apiClient.get<AnalyticsAggregation>("/api/admin/analytics/aggregate", {
    baseUrl: BASE,
    cache: "no-store",
    envelope: true,
    query: {
      from: filters?.from,
      to: filters?.to,
      event_type: filters?.eventType,
    },
  });
}
