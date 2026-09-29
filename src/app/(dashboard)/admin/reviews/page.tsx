"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Flag,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Clock,
  User,
  Eye,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/context/ToastProvider";
import { cn } from "@/lib/utils";
import {
  fetchModerationQueue,
  moderatePendingReview,
  moderateAbuseReport,
  resetModerationQueue,
  type PendingReviewItem,
  type AbuseReportItem,
  type ModerationQueueData,
  type ReviewModerationAction,
  type AbuseReportAction,
} from "@/lib/api/admin-reviews";
import type { ReviewRating } from "@/components/reviews/review-list";

type TabKey = "reviews" | "reports" | "history";

const PRESET_REVIEW_REJECTION_REASONS = [
  "Contains promotional spam, advertisements, or external web links",
  "Profanity, hate speech, or harassment violating community guidelines",
  "Unsubstantiated claims with no verified proof of work on Stellar",
  "Suspected fraudulent or competitor review manipulation",
  "Irrelevant commentary unrelated to artisan craftsmanship or deliverables",
];

const PRESET_REVIEW_APPROVAL_REASONS = [
  "Verified on-chain completion & genuine client feedback",
  "Meets all platform review and craftsmanship standards",
  "Balanced constructive feedback compliant with community rules",
];

const PRESET_REPORT_REMOVE_REASONS = [
  "Confirmed violation: Review contains abusive profanity or personal attacks",
  "Confirmed violation: Review confirmed as automated commercial spam",
  "Confirmed violation: Reviewer never transacted with artisan on platform",
  "Confirmed violation: Contains private personal information (PII)",
];

const PRESET_REPORT_DISMISS_REASONS = [
  "No violation found: Critical review reflects genuine client experience",
  "Feedback complies with platform constructive criticism policies",
  "Insufficient evidence of fraud or manipulation",
];

function Stars({ rating }: { rating: ReviewRating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= rating;
        return (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              filled ? "fill-amber-400 text-amber-400" : "text-slate-200"
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

function getReasonBadge(reason: AbuseReportItem["reason"]) {
  switch (reason) {
    case "abuse":
      return {
        label: "Abuse / Harassment",
        className: "bg-red-50 text-red-700 border-red-200",
      };
    case "spam":
      return {
        label: "Spam / Promotion",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "fake":
      return {
        label: "Fake Review",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    default:
      return {
        label: "Other Violation",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export default function ReviewModerationPage() {
  const [data, setData] = useState<ModerationQueueData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("reviews");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  // Selection for bulk actions
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

  // Action / Resolution Note Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    itemType: "review" | "report";
    item: PendingReviewItem | AbuseReportItem | null;
    action: ReviewModerationAction | AbuseReportAction;
    resolutionNote: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    itemType: "review",
    item: null,
    action: "approve",
    resolutionNote: "",
    isSubmitting: false,
  });

  // Inspect Modal
  const [inspectItem, setInspectItem] = useState<{
    item: PendingReviewItem | AbuseReportItem;
    type: "review" | "report";
  } | null>(null);

  const toast = useToast();

  const refreshQueue = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchModerationQueue();
      setData(result);
    } catch {
      toast.error("Failed to refresh moderation queue.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchModerationQueue();
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load moderation queue. Falling back to cached state.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Filtered pending reviews
  const filteredPendingReviews = (data?.pendingReviews ?? []).filter((r) => {
    // Tab matching
    if (activeTab === "reviews" && r.status !== "pending") return false;
    if (activeTab === "history" && r.status === "pending") return false;

    // Status filter on history tab
    if (activeTab === "history" && statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    // Rating filter
    if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesComment = r.comment.toLowerCase().includes(q);
      const matchesReviewer = r.reviewerName.toLowerCase().includes(q);
      const matchesArtisan = r.artisanName.toLowerCase().includes(q);
      const matchesJob = r.jobTitle.toLowerCase().includes(q);
      const matchesNote = r.resolutionNote?.toLowerCase().includes(q);
      if (!matchesComment && !matchesReviewer && !matchesArtisan && !matchesJob && !matchesNote) {
        return false;
      }
    }

    return true;
  });

  // Filtered abuse reports
  const filteredAbuseReports = (data?.abuseReports ?? []).filter((rep) => {
    // Tab matching
    if (activeTab === "reports" && rep.status !== "pending") return false;
    if (activeTab === "history" && rep.status === "pending") return false;

    // Status filter
    if (activeTab === "history" && statusFilter !== "all" && rep.status !== statusFilter) {
      return false;
    }

    // Reason filter
    if (reasonFilter !== "all" && rep.reason !== reasonFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesReason = rep.reason.toLowerCase().includes(q);
      const matchesDetails = rep.details?.toLowerCase().includes(q);
      const matchesReporter = rep.reporterName.toLowerCase().includes(q);
      const matchesReviewText = rep.reportedReview.comment.toLowerCase().includes(q);
      const matchesReviewer = rep.reportedReview.reviewerName.toLowerCase().includes(q);
      const matchesArtisan = rep.reportedReview.artisanName.toLowerCase().includes(q);
      const matchesNote = rep.resolutionNote?.toLowerCase().includes(q);

      if (
        !matchesReason &&
        !matchesDetails &&
        !matchesReporter &&
        !matchesReviewText &&
        !matchesReviewer &&
        !matchesArtisan &&
        !matchesNote
      ) {
        return false;
      }
    }

    return true;
  });

  // Open moderation action modal with resolution note prompt
  const openActionModal = (
    item: PendingReviewItem | AbuseReportItem,
    type: "review" | "report",
    action: ReviewModerationAction | AbuseReportAction
  ) => {
    let defaultNote = "";
    if (type === "review") {
      defaultNote =
        action === "approve"
          ? PRESET_REVIEW_APPROVAL_REASONS[0]
          : PRESET_REVIEW_REJECTION_REASONS[0];
    } else {
      defaultNote =
        action === "remove_review"
          ? PRESET_REPORT_REMOVE_REASONS[0]
          : PRESET_REPORT_DISMISS_REASONS[0];
    }

    setModalState({
      isOpen: true,
      itemType: type,
      item,
      action,
      resolutionNote: defaultNote,
      isSubmitting: false,
    });
  };

  // Submit moderation action
  const handleConfirmModeration = async () => {
    if (!modalState.item) return;

    setModalState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      if (modalState.itemType === "review") {
        const review = modalState.item as PendingReviewItem;
        const updated = await moderatePendingReview({
          reviewId: review.id,
          action: modalState.action as ReviewModerationAction,
          resolutionNote: modalState.resolutionNote.trim(),
        });

        // Update local state directly
        setData((prev) => {
          if (!prev) return null;
          const updatedReviews = prev.pendingReviews.map((r) =>
            r.id === updated.id ? updated : r
          );
          const pendingCount = updatedReviews.filter((r) => r.status === "pending").length;
          const moderatedCount =
            updatedReviews.filter((r) => r.status !== "pending").length +
            prev.abuseReports.filter((rep) => rep.status !== "pending").length;
          const approvedCount = updatedReviews.filter((r) => r.status === "approved").length;

          return {
            ...prev,
            pendingReviews: updatedReviews,
            stats: {
              ...prev.stats,
              totalPendingReviews: pendingCount,
              totalModeratedToday: moderatedCount,
              approvalRatePercent: Math.round(
                (approvedCount /
                  Math.max(1, updatedReviews.filter((r) => r.status !== "pending").length)) *
                  100
              ),
            },
          };
        });

        toast.success(
          modalState.action === "approve"
            ? `Review by ${review.reviewerName} approved and published.`
            : `Review by ${review.reviewerName} rejected.`
        );
      } else {
        const report = modalState.item as AbuseReportItem;
        const updated = await moderateAbuseReport({
          reportId: report.id,
          action: modalState.action as AbuseReportAction,
          resolutionNote: modalState.resolutionNote.trim(),
        });

        setData((prev) => {
          if (!prev) return null;
          const updatedReports = prev.abuseReports.map((rep) =>
            rep.id === updated.id ? updated : rep
          );
          const pendingReportsCount = updatedReports.filter((rep) => rep.status === "pending").length;
          const moderatedCount =
            prev.pendingReviews.filter((r) => r.status !== "pending").length +
            updatedReports.filter((rep) => rep.status !== "pending").length;

          return {
            ...prev,
            abuseReports: updatedReports,
            stats: {
              ...prev.stats,
              totalPendingReports: pendingReportsCount,
              totalModeratedToday: moderatedCount,
            },
          };
        });

        toast.success(
          modalState.action === "remove_review"
            ? `Report upheld. Review has been removed from public view.`
            : `Abuse report dismissed. Review remains active.`
        );
      }

      setModalState((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply moderation action."
      );
    } finally {
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Bulk action handlers
  const handleBulkApproveReviews = async () => {
    if (selectedReviewIds.size === 0) return;
    const ids = Array.from(selectedReviewIds);
    let successCount = 0;

    for (const id of ids) {
      try {
        await moderatePendingReview({
          reviewId: id,
          action: "approve",
          resolutionNote: "Bulk approved by admin moderation",
        });
        successCount++;
      } catch {
        // Continue
      }
    }

    toast.success(`Bulk approved ${successCount} pending reviews.`);
    setSelectedReviewIds(new Set());
    refreshQueue();
  };

  const handleBulkDismissReports = async () => {
    if (selectedReportIds.size === 0) return;
    const ids = Array.from(selectedReportIds);
    let successCount = 0;

    for (const id of ids) {
      try {
        await moderateAbuseReport({
          reportId: id,
          action: "dismiss",
          resolutionNote: "Bulk dismissed by admin moderation",
        });
        successCount++;
      } catch {
        // Continue
      }
    }

    toast.success(`Bulk dismissed ${successCount} abuse reports.`);
    setSelectedReportIds(new Set());
    refreshQueue();
  };

  const handleResetQueue = () => {
    const fresh = resetModerationQueue();
    setData(fresh);
    setSelectedReviewIds(new Set());
    setSelectedReportIds(new Set());
    toast.info("Moderation queue reset to initial demo state.");
  };

  const pendingReviewsCount = data?.pendingReviews.filter((r) => r.status === "pending").length ?? 0;
  const pendingReportsCount = data?.abuseReports.filter((r) => r.status === "pending").length ?? 0;
  const historyTotalCount =
    (data?.pendingReviews.filter((r) => r.status !== "pending").length ?? 0) +
    (data?.abuseReports.filter((r) => r.status !== "pending").length ?? 0);

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F4F3FE] text-[#605DEC]">
              <Sparkles className="w-3.5 h-3.5" />
              Content Governance
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Stellar Ecosystem Curation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Review Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Audit newly submitted artisan reviews, investigate reported community abuse, and maintain verified reputation standards across Artisyn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetQueue}
            className="text-xs text-gray-600 hover:text-gray-900"
            title="Reset queue to demo mock state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-gray-500" />
            Reset Demo Data
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshQueue}
            disabled={isRefreshing || isLoading}
            className="text-xs"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin text-[#605DEC]")}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Queue"}
          </Button>
        </div>
      </div>

      {/* KPI Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Reviews"
          value={pendingReviewsCount}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          className={pendingReviewsCount > 0 ? "border-amber-200 bg-amber-50/20" : ""}
        />
        <StatCard
          label="Abuse Reports"
          value={pendingReportsCount}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          className={pendingReportsCount > 0 ? "border-red-200 bg-red-50/20" : ""}
        />
        <StatCard
          label="Actioned Items"
          value={data?.stats.totalModeratedToday ?? 0}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Approval Rate"
          value={`${data?.stats.approvalRatePercent ?? 85}%`}
          icon={<CheckCircle2 className="w-5 h-5 text-[#605DEC]" />}
        />
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 bg-gray-50/50 px-4 sm:px-6 pt-3">
          <nav className="flex space-x-6 sm:space-x-8" aria-label="Moderation Queue Tabs">
            <button
              onClick={() => {
                setActiveTab("reviews");
                setStatusFilter("all");
              }}
              className={cn(
                "group inline-flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === "reviews"
                  ? "border-[#605DEC] text-[#605DEC]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Pending Reviews</span>
              {pendingReviewsCount > 0 && (
                <span
                  className={cn(
                    "ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-colors",
                    activeTab === "reviews"
                      ? "bg-[#605DEC] text-white"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {pendingReviewsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("reports");
                setStatusFilter("all");
              }}
              className={cn(
                "group inline-flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === "reports"
                  ? "border-[#605DEC] text-[#605DEC]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Flag className="w-4 h-4" />
              <span>Abuse Reports</span>
              {pendingReportsCount > 0 && (
                <span
                  className={cn(
                    "ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-colors",
                    activeTab === "reports"
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-800"
                  )}
                >
                  {pendingReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                setStatusFilter("all");
              }}
              className={cn(
                "group inline-flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === "history"
                  ? "border-[#605DEC] text-[#605DEC]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Moderation History</span>
              {historyTotalCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-gray-200 text-gray-700">
                  {historyTotalCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "reports"
                    ? "Search reports by reporter, reason, or content..."
                    : "Search reviews by reviewer, artisan, or comment..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#605DEC] focus:border-transparent placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {activeTab === "history" && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#605DEC] focus:outline-none"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="resolved">Report Resolved (Removed)</option>
                    <option value="dismissed">Report Dismissed</option>
                  </select>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <span className="text-gray-500">Rating:</span>
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#605DEC] focus:outline-none"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <span className="text-gray-500">Reason:</span>
                  <select
                    value={reasonFilter}
                    onChange={(e) => setReasonFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#605DEC] focus:outline-none"
                  >
                    <option value="all">All Reasons</option>
                    <option value="abuse">Abuse / Harassment</option>
                    <option value="spam">Spam / Commercial</option>
                    <option value="fake">Fake Review</option>
                    <option value="other">Other Violation</option>
                  </select>
                </div>
              )}

              {/* Bulk Actions for reviews tab */}
              {activeTab === "reviews" && selectedReviewIds.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <span className="text-xs font-medium text-gray-500">
                    {selectedReviewIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    onClick={handleBulkApproveReviews}
                    className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Approve Selected
                  </Button>
                </div>
              )}

              {/* Bulk Actions for reports tab */}
              {activeTab === "reports" && selectedReportIds.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <span className="text-xs font-medium text-gray-500">
                    {selectedReportIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDismissReports}
                    className="h-8 px-2.5 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Dismiss Selected
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3 p-4 rounded-lg bg-gray-50">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeTab === "reviews" ? (
            /* TAB 1: PENDING REVIEWS */
            filteredPendingReviews.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  All pending reviews moderated!
                </h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                  There are no reviews currently awaiting moderation. New client submissions will appear here automatically.
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-xs"
                  >
                    Clear search filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPendingReviews.map((review) => {
                  const isSelected = selectedReviewIds.has(review.id);
                  return (
                    <article
                      key={review.id}
                      className={cn(
                        "p-5 sm:p-6 transition-colors hover:bg-gray-50/80 flex flex-col md:flex-row gap-5 items-start justify-between",
                        isSelected && "bg-[#F4F3FE]/40"
                      )}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Checkbox for batch */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedReviewIds);
                            if (e.target.checked) next.add(review.id);
                            else next.delete(review.id);
                            setSelectedReviewIds(next);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#605DEC] focus:ring-[#605DEC]"
                          aria-label={`Select review by ${review.reviewerName}`}
                        />

                        {/* Review Content */}
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Review Meta Header */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span>{review.reviewerName}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">
                              reviewed{" "}
                              <span className="font-medium text-gray-900">
                                {review.artisanName}
                              </span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatDate(review.createdAt)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-xs">
                              {review.jobTitle}
                            </span>
                          </div>

                          {/* Star Rating & Flags */}
                          <div className="flex items-center gap-3">
                            <Stars rating={review.rating} />
                            {review.flaggedReason && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {review.flaggedReason}
                              </span>
                            )}
                          </div>

                          {/* Comment Body */}
                          <p className="text-sm text-gray-800 leading-relaxed font-normal whitespace-pre-wrap">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectItem({ item: review, type: "review" })}
                          className="h-8 text-xs text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-gray-500" />
                          Details
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionModal(review, "review", "reject")}
                          className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openActionModal(review, "review", "approve")}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : activeTab === "reports" ? (
            /* TAB 2: ABUSE REPORTS */
            filteredAbuseReports.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Zero active abuse reports!
                </h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                  All community abuse reports have been resolved. The community trust score is verified and clean.
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-xs"
                  >
                    Clear search filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAbuseReports.map((report) => {
                  const badge = getReasonBadge(report.reason);
                  const isSelected = selectedReportIds.has(report.id);

                  return (
                    <article
                      key={report.id}
                      className={cn(
                        "p-5 sm:p-6 transition-colors hover:bg-gray-50/80 flex flex-col md:flex-row gap-5 items-start justify-between",
                        isSelected && "bg-[#F4F3FE]/40"
                      )}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedReportIds);
                            if (e.target.checked) next.add(report.id);
                            else next.delete(report.id);
                            setSelectedReportIds(next);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#605DEC] focus:ring-[#605DEC]"
                          aria-label={`Select report ${report.id}`}
                        />

                        {/* Report & Reported Content */}
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Report Meta Header */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full font-semibold border text-xs flex items-center gap-1",
                                badge.className
                              )}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {badge.label}
                            </span>
                            <span className="text-gray-500">
                              Reported by{" "}
                              <span className="font-semibold text-gray-900">
                                {report.reporterName}
                              </span>{" "}
                              ({report.reporterRole})
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatDate(report.createdAt)}
                            </span>
                          </div>

                          {/* Reporter Details / Grievance */}
                          {report.details && (
                            <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                              <span className="font-semibold block text-amber-950">
                                Reporter Context:
                              </span>
                              <p className="leading-relaxed">{report.details}</p>
                            </div>
                          )}

                          {/* The Reported Review Preview */}
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {report.reportedReview.reviewerName}
                                </span>
                                <span>&rarr;</span>
                                <span className="font-medium text-gray-700">
                                  {report.reportedReview.artisanName}
                                </span>
                              </div>
                              <Stars rating={report.reportedReview.rating} />
                            </div>
                            <p className="text-sm text-gray-800 italic leading-relaxed">
                              &ldquo;{report.reportedReview.comment}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectItem({ item: report, type: "report" })}
                          className="h-8 text-xs text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-gray-500" />
                          Details
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionModal(report, "report", "dismiss")}
                          className="h-8 text-xs text-gray-700 hover:bg-gray-100"
                        >
                          <X className="w-3.5 h-3.5 mr-1 text-gray-500" />
                          Dismiss Report
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openActionModal(report, "report", "remove_review")}
                          className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Remove Review
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 3: MODERATION HISTORY */
            filteredPendingReviews.length === 0 && filteredAbuseReports.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-500 mb-4">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  No moderated items in history matching filter
                </h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                  Past decisions, resolutions notes, and moderation audit trails will appear here once actions are taken.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Moderated Reviews */}
                {filteredPendingReviews.map((review) => (
                  <article key={review.id} className="p-5 sm:p-6 bg-white hover:bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full font-semibold text-xs inline-flex items-center gap-1",
                              review.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            )}
                          >
                            {review.status === "approved" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Review {review.status === "approved" ? "Approved" : "Rejected"}
                          </span>

                          <span className="text-gray-500">
                            by {review.reviewerName} for {review.artisanName}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500">
                            Moderated {review.moderatedAt ? formatDate(review.moderatedAt) : "Recently"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Stars rating={review.rating} />
                          <span className="text-xs text-gray-500">({review.jobTitle})</span>
                        </div>

                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          &ldquo;{review.comment}&rdquo;
                        </p>

                        {review.resolutionNote && (
                          <div className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-md p-2.5 text-gray-700">
                            <span className="font-semibold text-gray-900 block mb-0.5">
                              Resolution Note:
                            </span>
                            {review.resolutionNote}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectItem({ item: review, type: "review" })}
                        className="text-xs self-start"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Audit
                      </Button>
                    </div>
                  </article>
                ))}

                {/* Moderated Reports */}
                {filteredAbuseReports.map((report) => (
                  <article key={report.id} className="p-5 sm:p-6 bg-white hover:bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full font-semibold text-xs inline-flex items-center gap-1",
                              report.status === "resolved"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            {report.status === "resolved" ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Report {report.status === "resolved" ? "Upheld (Review Removed)" : "Dismissed"}
                          </span>

                          <span className="text-gray-500">
                            Reported by {report.reporterName} ({report.reason})
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500">
                            Resolved {report.resolvedAt ? formatDate(report.resolvedAt) : "Recently"}
                          </span>
                        </div>

                        <div className="border-l-2 border-gray-200 pl-3 py-1 my-1">
                          <p className="text-xs text-gray-600 italic">
                            Reported Review: &ldquo;{report.reportedReview.comment}&rdquo;
                          </p>
                        </div>

                        {report.resolutionNote && (
                          <div className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-md p-2.5 text-gray-700">
                            <span className="font-semibold text-gray-900 block mb-0.5">
                              Resolution Note:
                            </span>
                            {report.resolutionNote}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectItem({ item: report, type: "report" })}
                        className="text-xs self-start"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Audit
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* MODAL: Moderation Action & Resolution Notes */}
      {modalState.isOpen && modalState.item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-action-title"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
              disabled={modalState.isSubmitting}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-md"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  modalState.action === "approve"
                    ? "bg-emerald-50 text-emerald-600"
                    : modalState.action === "reject" || modalState.action === "remove_review"
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-100 text-slate-700"
                )}
              >
                {modalState.action === "approve" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : modalState.action === "reject" || modalState.action === "remove_review" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <h2 id="modal-action-title" className="text-lg font-bold text-gray-900">
                {modalState.itemType === "review"
                  ? modalState.action === "approve"
                    ? "Approve Review for Publication"
                    : "Reject Review Submission"
                  : modalState.action === "remove_review"
                  ? "Uphold Abuse Report & Remove Review"
                  : "Dismiss Abuse Report"}
              </h2>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Enter a resolution note documenting your decision rationale. This creates an unalterable audit log entry for moderation governance.
            </p>

            {/* Target Item Snippet Preview */}
            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-3.5 text-xs space-y-1">
              {modalState.itemType === "review" ? (
                <>
                  <div className="flex items-center justify-between text-gray-500 font-medium">
                    <span>
                      {(modalState.item as PendingReviewItem).reviewerName} on{" "}
                      {(modalState.item as PendingReviewItem).artisanName}
                    </span>
                    <Stars rating={(modalState.item as PendingReviewItem).rating} />
                  </div>
                  <p className="text-gray-800 line-clamp-2 italic">
                    &ldquo;{(modalState.item as PendingReviewItem).comment}&rdquo;
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-gray-500 font-medium">
                    <span>Reported by {(modalState.item as AbuseReportItem).reporterName}</span>
                    <span className="font-semibold text-red-600 uppercase text-[10px]">
                      {(modalState.item as AbuseReportItem).reason}
                    </span>
                  </div>
                  <p className="text-gray-800 line-clamp-2 italic">
                    &ldquo;{(modalState.item as AbuseReportItem).reportedReview.comment}&rdquo;
                  </p>
                </>
              )}
            </div>

            {/* Quick Reason Presets */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Common Decision Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(modalState.itemType === "review"
                  ? modalState.action === "approve"
                    ? PRESET_REVIEW_APPROVAL_REASONS
                    : PRESET_REVIEW_REJECTION_REASONS
                  : modalState.action === "remove_review"
                  ? PRESET_REPORT_REMOVE_REASONS
                  : PRESET_REPORT_DISMISS_REASONS
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setModalState((prev) => ({ ...prev, resolutionNote: preset }))
                    }
                    className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-left"
                  >
                    {preset.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Note Textarea */}
            <div className="mb-5">
              <label
                htmlFor="resolution-note-input"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Resolution Note & Audit Rationale *
              </label>
              <textarea
                id="resolution-note-input"
                rows={3}
                value={modalState.resolutionNote}
                onChange={(e) =>
                  setModalState((prev) => ({ ...prev, resolutionNote: e.target.value }))
                }
                placeholder="Explain the reason for this moderation decision..."
                className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:border-[#605DEC] focus:ring-1 focus:ring-[#605DEC] focus:outline-none"
                required
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Required for review rejections and removals to notify parties.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                disabled={modalState.isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleConfirmModeration}
                disabled={modalState.isSubmitting || !modalState.resolutionNote.trim()}
                className={cn(
                  "text-xs text-white",
                  modalState.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : modalState.action === "reject" || modalState.action === "remove_review"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#605DEC] hover:bg-[#524fcb]"
                )}
              >
                {modalState.isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm & Apply Action"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Inspection / Audit Details */}
      {inspectItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-inspect-title"
        >
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectItem(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-md"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 id="modal-inspect-title" className="text-lg font-bold text-gray-900 mb-4">
              {inspectItem.type === "review"
                ? "Pending Review Details"
                : "Abuse Investigation Details"}
            </h2>

            {inspectItem.type === "review" ? (
              (() => {
                const item = inspectItem.item as PendingReviewItem;
                return (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-gray-400 block font-medium">Reviewer</span>
                        <span className="font-semibold text-gray-900">
                          {item.reviewerName} ({item.reviewerRole})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Artisan</span>
                        <span className="font-semibold text-gray-900">{item.artisanName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Submitted</span>
                        <span className="text-gray-700">{formatDate(item.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Rating</span>
                        <Stars rating={item.rating} />
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 font-semibold block mb-1">
                        Contract / Listing
                      </span>
                      <p className="text-gray-800 bg-gray-50 p-2.5 rounded-md border border-gray-100">
                        {item.jobTitle}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500 font-semibold block mb-1">
                        Full Review Commentary
                      </span>
                      <div className="p-3.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">
                        {item.comment}
                      </div>
                    </div>

                    {item.flaggedReason && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                        <span className="font-bold block mb-0.5">Automated Scan Flag:</span>
                        {item.flaggedReason}
                      </div>
                    )}

                    {item.resolutionNote && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <span className="font-bold block mb-0.5">Resolution Note:</span>
                        {item.resolutionNote}
                        <span className="block text-[11px] text-emerald-700 mt-1">
                          Moderated at {item.moderatedAt ? formatDate(item.moderatedAt) : ""} by{" "}
                          {item.moderatedBy}
                        </span>
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInspectItem(null);
                            openActionModal(item, "review", "reject");
                          }}
                          className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setInspectItem(null);
                            openActionModal(item, "review", "approve");
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              (() => {
                const rep = inspectItem.item as AbuseReportItem;
                return (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-gray-400 block font-medium">Reporter</span>
                        <span className="font-semibold text-gray-900">
                          {rep.reporterName} ({rep.reporterRole})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Reason</span>
                        <span className="font-semibold text-red-600 uppercase">
                          {rep.reason}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Report Date</span>
                        <span className="text-gray-700">{formatDate(rep.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Report Status</span>
                        <span className="font-semibold capitalize text-gray-900">
                          {rep.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 font-semibold block mb-1">
                        Reporter&apos;s Stated Grievance
                      </span>
                      <p className="text-gray-800 bg-amber-50/70 border border-amber-200 p-3 rounded-md leading-relaxed">
                        {rep.details || "No additional context provided by reporter."}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500 font-semibold block mb-1">
                        Reported Review Under Investigation
                      </span>
                      <div className="p-3.5 rounded-lg border border-gray-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {rep.reportedReview.reviewerName} &rarr;{" "}
                            {rep.reportedReview.artisanName}
                          </span>
                          <Stars rating={rep.reportedReview.rating} />
                        </div>
                        <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                          &ldquo;{rep.reportedReview.comment}&rdquo;
                        </p>
                      </div>
                    </div>

                    {rep.resolutionNote && (
                      <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900">
                        <span className="font-bold block mb-0.5">Resolution Audit Note:</span>
                        {rep.resolutionNote}
                        <span className="block text-[11px] text-gray-600 mt-1">
                          Resolved at {rep.resolvedAt ? formatDate(rep.resolvedAt) : ""} by{" "}
                          {rep.resolvedBy}
                        </span>
                      </div>
                    )}

                    {rep.status === "pending" && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInspectItem(null);
                            openActionModal(rep, "report", "dismiss");
                          }}
                          className="text-xs text-gray-700"
                        >
                          Dismiss Report
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setInspectItem(null);
                            openActionModal(rep, "report", "remove_review");
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          Remove Review
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
