"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Briefcase,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Star,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import {
  fetchAnalyticsSummary,
  fetchAnalyticsAggregation,
  type AnalyticsSummary,
  type AnalyticsAggregation,
  type AnalyticsFilters,
} from "@/lib/api/analytics";
import { StatCard } from "@/components/ui/stat-card";

// ─── Date range helpers ───────────────────────────────────────────────────────

type DateRangeOption = "7d" | "30d" | "90d" | "custom";

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function dateRangeFromOption(option: DateRangeOption): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date();

  switch (option) {
    case "7d":
      from.setDate(to.getDate() - 7);
      break;
    case "30d":
      from.setDate(to.getDate() - 30);
      break;
    case "90d":
      from.setDate(to.getDate() - 90);
      break;
    default:
      from.setDate(to.getDate() - 30);
  }

  return { from: toIsoDate(from), to: toIsoDate(to) };
}

// ─── Event type options ───────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "registration", label: "Registrations" },
  { value: "job_posted", label: "Jobs Posted" },
  { value: "job_completed", label: "Jobs Completed" },
  { value: "payment", label: "Payments" },
];

// ─── Skeleton components ──────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Fixed bar heights for the chart skeleton (avoids Math.random in render)
const SKELETON_BAR_HEIGHTS = [60, 40, 75, 50, 85, 45, 70, 55, 90, 35, 65, 80, 50, 70];

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="flex items-end gap-2 h-40">
        {SKELETON_BAR_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-100 rounded-t"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Inline bar chart (no external charting lib) ─────────────────────────────

interface BarChartProps {
  data: { date: string; value: number }[];
  label: string;
  color?: string;
}

function BarChart({ data, label, color = "bg-[#605DEC]" }: BarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No data for this period
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div
        className="flex items-end gap-1 h-40"
        role="img"
        aria-label={`${label} bar chart`}
      >
        {data.map((point, i) => {
          const heightPct = Math.round((point.value / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {point.date}: {point.value.toLocaleString()}
                </div>
                <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
              </div>
              <div
                className={`w-full rounded-t transition-all duration-300 ${color} opacity-80 hover:opacity-100`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${point.date}: ${point.value}`}
              />
            </div>
          );
        })}
      </div>
      {/* x-axis: show first, middle, last labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{data[0]?.date}</span>
        {data.length > 2 && (
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
        )}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Category breakdown table ─────────────────────────────────────────────────

interface CategoryTableProps {
  data: { category: string; count: number }[];
}

function CategoryBreakdown({ data }: CategoryTableProps) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No category data available.
      </p>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.category}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium capitalize">
                {item.category}
              </span>
              <span className="text-gray-500">
                {item.count.toLocaleString()} ({pct}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-[#605DEC] h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.category}: ${pct}%`}
              />
            </div>
          </div>
        );
      })}
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
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          Could not load analytics data
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

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  rangeOption: DateRangeOption;
  onRangeChange: (v: DateRangeOption) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  eventType: string;
  onEventTypeChange: (v: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

function FilterBar({
  rangeOption,
  onRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  eventType,
  onEventTypeChange,
  loading,
  onRefresh,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      {/* Date range quick-select */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="range-select"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Date range:
        </label>
        <select
          id="range-select"
          value={rangeOption}
          onChange={(e) => onRangeChange(e.target.value as DateRangeOption)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent"
        >          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {/* Custom date inputs */}
      {rangeOption === "custom" && (
        <div className="flex items-center gap-2">
          <label htmlFor="from-date" className="sr-only">
            From date
          </label>
          <input
            id="from-date"
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent"
            aria-label="Start date"
          />
          <span className="text-gray-500 text-sm">to</span>
          <label htmlFor="to-date" className="sr-only">
            To date
          </label>
          <input
            id="to-date"
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent"
            aria-label="End date"
          />
        </div>
      )}

      {/* Event type filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="event-type-select"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Event type:
        </label>
        <select
          id="event-type-select"
          value={eventType}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto flex items-center gap-1.5 text-sm font-medium text-[#605DEC] hover:text-[#4a47d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Refresh analytics data"
      >
        <RefreshCw
          className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        Refresh
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  // Filter state
  const [rangeOption, setRangeOption] = useState<DateRangeOption>("30d");
  const [customFrom, setCustomFrom] = useState(() =>
    toIsoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [customTo, setCustomTo] = useState(() => toIsoDate(new Date()));
  const [eventType, setEventType] = useState("");

  // Data state
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [aggregation, setAggregation] = useState<AnalyticsAggregation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Build filters from current state
  const buildFilters = useCallback((): AnalyticsFilters => {
    const range =
      rangeOption === "custom"
        ? { from: customFrom, to: customTo }
        : dateRangeFromOption(rangeOption);

    return {
      from: range.from,
      to: range.to,
      eventType: eventType || undefined,
    };
  }, [rangeOption, customFrom, customTo, eventType]);

  // Fetch both endpoints in parallel
  useEffect(() => {
    let cancelled = false;

    const filters = buildFilters();

    (async () => {
      try {
        const [summaryData, aggregationData] = await Promise.all([
          fetchAnalyticsSummary(filters),
          fetchAnalyticsAggregation(filters),
        ]);
        if (!cancelled) {
          setSummary(summaryData);
          setAggregation(aggregationData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, buildFilters]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-7 h-7 text-[#605DEC]" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Analytics
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">
          Monitor growth, activity, and risk patterns across the platform.
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        rangeOption={rangeOption}
        onRangeChange={(v) => {
          setRangeOption(v);
          setReloadKey((k) => k + 1);
        }}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={(v) => setCustomFrom(v)}
        onCustomToChange={(v) => setCustomTo(v)}
        eventType={eventType}
        onEventTypeChange={(v) => {
          setEventType(v);
          setReloadKey((k) => k + 1);
        }}
        loading={loading}
        onRefresh={handleRefresh}
      />

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={handleRefresh} />}

      {/* ── Summary KPI cards ─────────────────────────────────────────── */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <h2
          id="kpi-heading"
          className="text-lg font-semibold text-gray-800 mb-4"
        >
          Summary
        </h2>

        {loading ? (
          <KpiSkeleton />
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Users className="w-5 h-5 text-[#605DEC]" />}
              label="Total Users"
              value={summary.totalUsers.toLocaleString()}
              trend={
                summary.userGrowthRate !== 0
                  ? {
                      value: Math.abs(summary.userGrowthRate),
                      direction: summary.userGrowthRate >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-blue-500" />}
              label="Total Artisans"
              value={summary.totalArtisans.toLocaleString()}
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-purple-500" />}
              label="Total Clients"
              value={summary.totalClients.toLocaleString()}
            />
            <StatCard
              icon={<Briefcase className="w-5 h-5 text-orange-500" />}
              label="Total Jobs"
              value={summary.totalJobs.toLocaleString()}
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              label="Completed Jobs"
              value={summary.completedJobs.toLocaleString()}
              trend={
                summary.jobCompletionRate !== 0
                  ? {
                      value: Math.abs(summary.jobCompletionRate),
                      direction:
                        summary.jobCompletionRate >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Briefcase className="w-5 h-5 text-yellow-500" />}
              label="Active Jobs"
              value={summary.activeJobs.toLocaleString()}
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
              label="Total Revenue"
              value={summary.totalRevenue}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-400" />}
              label="Avg. Rating"
              value={summary.averageRating.toFixed(1)}
            />
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                No summary data available
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting the date range or event type filter.
              </p>
            </div>
          )
        )}
      </section>

      {/* ── Period highlights ─────────────────────────────────────────── */}
      {(loading || summary) && (
        <section aria-labelledby="period-heading" className="mb-8">
          <h2
            id="period-heading"
            className="text-lg font-semibold text-gray-800 mb-4"
          >
            This Period
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-8 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard
                  icon={<Users className="w-5 h-5 text-[#605DEC]" />}
                  label="New Users (Period)"
                  value={summary.newUsersThisPeriod.toLocaleString()}
                />
                <StatCard
                  icon={<Briefcase className="w-5 h-5 text-orange-500" />}
                  label="New Jobs (Period)"
                  value={summary.newJobsThisPeriod.toLocaleString()}
                />
              </div>
            )
          )}
        </section>
      )}

      {/* ── Trend charts ──────────────────────────────────────────────── */}
      <section aria-labelledby="trends-heading" className="mb-8">
        <h2
          id="trends-heading"
          className="text-lg font-semibold text-gray-800 mb-4"
        >
          Trends
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : aggregation ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User growth chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                User Growth
              </h3>
              <BarChart
                data={aggregation.userGrowth}
                label="User growth"
                color="bg-[#605DEC]"
              />
            </div>

            {/* Job activity chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Job Activity
              </h3>
              <BarChart
                data={aggregation.jobActivity}
                label="Job activity"
                color="bg-orange-400"
              />
            </div>

            {/* Revenue over time */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Revenue Over Time
              </h3>
              <BarChart
                data={aggregation.revenueOverTime}
                label="Revenue over time"
                color="bg-emerald-500"
              />
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Registrations by Category
              </h3>
              <CategoryBreakdown
                data={aggregation.registrationsByCategory}
              />
            </div>
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                No trend data available
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting the date range or event type filter.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
