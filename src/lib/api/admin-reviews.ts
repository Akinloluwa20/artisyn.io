import { apiClient } from "./client";
import type { ReviewRating } from "@/components/reviews/review-list";

export type ModerationItemType = "review" | "report";
export type PendingReviewStatus = "pending" | "approved" | "rejected";
export type AbuseReportStatus = "pending" | "resolved" | "dismissed";
export type AbuseReportAction = "remove_review" | "dismiss";
export type ReviewModerationAction = "approve" | "reject";

export interface PendingReviewItem {
  id: string;
  rating: ReviewRating;
  comment: string;
  reviewerName: string;
  reviewerRole: "client" | "artisan";
  artisanId: string;
  artisanName: string;
  jobTitle: string;
  createdAt: string;
  status: PendingReviewStatus;
  flaggedReason?: string;
  resolutionNote?: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

export interface AbuseReportItem {
  id: string;
  reviewId: string;
  reason: "spam" | "abuse" | "fake" | "other";
  details?: string;
  reporterName: string;
  reporterRole: "client" | "artisan";
  createdAt: string;
  status: AbuseReportStatus;
  resolutionAction?: AbuseReportAction;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  reportedReview: {
    id: string;
    rating: ReviewRating;
    comment: string;
    reviewerName: string;
    artisanName: string;
    createdAt: string;
  };
}

export interface ModerationStats {
  totalPendingReviews: number;
  totalPendingReports: number;
  totalModeratedToday: number;
  approvalRatePercent: number;
}

export interface ModerationQueueData {
  pendingReviews: PendingReviewItem[];
  abuseReports: AbuseReportItem[];
  stats: ModerationStats;
}

export interface ModerateReviewPayload {
  reviewId: string;
  action: ReviewModerationAction;
  resolutionNote?: string;
}

export interface ModerateReportPayload {
  reportId: string;
  action: AbuseReportAction;
  resolutionNote?: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const STORAGE_KEY = "artisyn_admin_moderation_queue_v1";

export const INITIAL_PENDING_REVIEWS: PendingReviewItem[] = [
  {
    id: "rev-pending-101",
    rating: 5,
    comment:
      "Elena crafted a bespoke mahogany coffee table for our living room. Exceptional joinery, prompt communication, and delivery ahead of schedule. Truly high-end artisan craftsmanship.",
    reviewerName: "Marcus Sterling",
    reviewerRole: "client",
    artisanId: "art-101",
    artisanName: "Elena Vance",
    jobTitle: "Custom Mahogany Living Room Table",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: "pending",
  },
  {
    id: "rev-pending-102",
    rating: 1,
    comment:
      "DO NOT HIRE! Join our crypto signals group at t.me/stellar_wealth for 500% daily gains. DM for free signals and trading bots!",
    reviewerName: "CryptoWhale_99",
    reviewerRole: "client",
    artisanId: "art-102",
    artisanName: "Aisha Bello",
    jobTitle: "Ceramic Dinnerware Set",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    status: "pending",
    flaggedReason: "Automated spam filter detected external links and promotional text",
  },
  {
    id: "rev-pending-103",
    rating: 4,
    comment:
      "Solid architectural metal railing installation. The welding lines are crisp and powder coating is clean. Minor delay in transit, but overall great craftsmanship.",
    reviewerName: "Sarah Jenkins",
    reviewerRole: "client",
    artisanId: "art-103",
    artisanName: "Tunde Bakare",
    jobTitle: "Custom Architectural Balcony Railings",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    status: "pending",
  },
  {
    id: "rev-pending-104",
    rating: 2,
    comment:
      "The hand-carved mask arrived with noticeable splinters and uneven staining compared to photos shown in the artisan portfolio. Communication was okay but expected better QA.",
    reviewerName: "David K. Wilson",
    reviewerRole: "client",
    artisanId: "art-104",
    artisanName: "Kofi Mensah",
    jobTitle: "Traditional Mahogany Wall Mask",
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    status: "pending",
  },
  {
    id: "rev-pending-105",
    rating: 5,
    comment:
      "Outstanding custom handwoven tapestries for our corporate lobby. Amina incorporated our brand palette flawlessly. Stellar escrow payment was smooth and verifiable.",
    reviewerName: "Ngozi Okafor",
    reviewerRole: "client",
    artisanId: "art-105",
    artisanName: "Amina Diallo",
    jobTitle: "Corporate Lobby Woven Art Installation",
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(), // 8 hours ago
    status: "pending",
  },
];

export const INITIAL_ABUSE_REPORTS: AbuseReportItem[] = [
  {
    id: "rep-pending-201",
    reviewId: "rev-ext-301",
    reason: "abuse",
    details:
      "This individual never booked any consultation or work with our studio. They are posting abusive profanity and personal insults targeting my family.",
    reporterName: "Elena Vance",
    reporterRole: "artisan",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    status: "pending",
    reportedReview: {
      id: "rev-ext-301",
      rating: 1,
      comment:
        "Total fraud and scammer! Don't trust this idiot artisan, absolute garbage person and terrible service.",
      reviewerName: "TrollAccount_88",
      artisanName: "Elena Vance",
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  },
  {
    id: "rep-pending-202",
    reviewId: "rev-ext-302",
    reason: "spam",
    details:
      "Spam bot advertising commercial knock-off goods and off-platform WhatsApp contact numbers.",
    reporterName: "Mateo Alvarez",
    reporterRole: "artisan",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    status: "pending",
    reportedReview: {
      id: "rev-ext-302",
      rating: 5,
      comment:
        "Get cheap discount leather goods wholesale contact WhatsApp +1-800-FAKE-GOODS or visit our clone website!",
      reviewerName: "PromoBot_V2",
      artisanName: "Mateo Alvarez",
      createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    },
  },
  {
    id: "rep-pending-203",
    reviewId: "rev-ext-303",
    reason: "fake",
    details:
      "Competitor studio fabricated this review to artificially depress my trust rating. There is no escrow milestone or job order on Stellar for this reviewer.",
    reporterName: "Fatima Zahra",
    reporterRole: "artisan",
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    status: "pending",
    reportedReview: {
      id: "rev-ext-303",
      rating: 1,
      comment:
        "Fabric tore immediately and dyes washed out within two days. Extremely poor quality craftsmanship.",
      reviewerName: "Anonymous_Competitor",
      artisanName: "Fatima Zahra",
      createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    },
  },
  {
    id: "rep-pending-204",
    reviewId: "rev-ext-304",
    reason: "other",
    details:
      "Review contains personal private phone numbers and personal home address in violation of privacy policy.",
    reporterName: "Liam O'Connor",
    reporterRole: "artisan",
    createdAt: new Date(Date.now() - 1000 * 60 * 280).toISOString(),
    status: "pending",
    reportedReview: {
      id: "rev-ext-304",
      rating: 4,
      comment:
        "Great woodwork repairs. Liam works from his garage at 742 Evergreen Terrace, call his personal cell at 555-0199 directly.",
      reviewerName: "Gerald Simmons",
      artisanName: "Liam O'Connor",
      createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    },
  },
];

function calculateStats(
  reviews: PendingReviewItem[],
  reports: AbuseReportItem[]
): ModerationStats {
  const pendingReviewsCount = reviews.filter((r) => r.status === "pending").length;
  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

  const moderatedReviews = reviews.filter((r) => r.status !== "pending");
  const approvedReviews = reviews.filter((r) => r.status === "approved").length;
  const moderatedReports = reports.filter((r) => r.status !== "pending");

  const totalModerated = moderatedReviews.length + moderatedReports.length;
  const approvalRate =
    moderatedReviews.length > 0
      ? Math.round((approvedReviews / moderatedReviews.length) * 100)
      : 88;

  return {
    totalPendingReviews: pendingReviewsCount,
    totalPendingReports: pendingReportsCount,
    totalModeratedToday: totalModerated,
    approvalRatePercent: approvalRate,
  };
}

function getStoredQueue(): ModerationQueueData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ModerationQueueData;
  } catch {
    return null;
  }
}

function saveStoredQueue(data: ModerationQueueData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getLocalFallbackData(): ModerationQueueData {
  const stored = getStoredQueue();
  if (stored) {
    return {
      ...stored,
      stats: calculateStats(stored.pendingReviews, stored.abuseReports),
    };
  }

  const initialData: ModerationQueueData = {
    pendingReviews: INITIAL_PENDING_REVIEWS,
    abuseReports: INITIAL_ABUSE_REPORTS,
    stats: calculateStats(INITIAL_PENDING_REVIEWS, INITIAL_ABUSE_REPORTS),
  };
  saveStoredQueue(initialData);
  return initialData;
}

/**
 * Fetches the moderation queue containing pending reviews, abuse reports, and queue stats.
 */
export async function fetchModerationQueue(): Promise<ModerationQueueData> {
  try {
    const envelope = await apiClient.get<ApiResponseEnvelope<ModerationQueueData>>(
      "/api/admin/reviews"
    );
    if (envelope?.data) {
      saveStoredQueue(envelope.data);
      return envelope.data;
    }
  } catch {
    // If backend endpoint is unavailable or returns error, fall back gracefully to local store
  }

  return getLocalFallbackData();
}

/**
 * Moderates a pending review (approve or reject with resolution note).
 */
export async function moderatePendingReview(
  payload: ModerateReviewPayload
): Promise<PendingReviewItem> {
  const { reviewId, action, resolutionNote } = payload;

  try {
    const envelope = await apiClient.post<ApiResponseEnvelope<PendingReviewItem>>(
      "/api/admin/reviews",
      {
        itemType: "review",
        id: reviewId,
        action,
        resolutionNote,
      }
    );
    if (envelope?.data) {
      // Also update local store
      updateLocalReview(envelope.data);
      return envelope.data;
    }
  } catch {
    // Fallback locally
  }

  const queue = getLocalFallbackData();
  const target = queue.pendingReviews.find((r) => r.id === reviewId);
  if (!target) {
    throw new Error(`Review ${reviewId} not found in moderation queue`);
  }

  const updated: PendingReviewItem = {
    ...target,
    status: action === "approve" ? "approved" : "rejected",
    resolutionNote: resolutionNote ?? (action === "approve" ? "Approved by admin" : "Rejected by admin"),
    moderatedAt: new Date().toISOString(),
    moderatedBy: "Admin Curator",
  };

  const updatedReviews = queue.pendingReviews.map((r) =>
    r.id === reviewId ? updated : r
  );
  const nextData: ModerationQueueData = {
    ...queue,
    pendingReviews: updatedReviews,
    stats: calculateStats(updatedReviews, queue.abuseReports),
  };
  saveStoredQueue(nextData);
  return updated;
}

/**
 * Moderates an abuse report (remove_review or dismiss with resolution note).
 */
export async function moderateAbuseReport(
  payload: ModerateReportPayload
): Promise<AbuseReportItem> {
  const { reportId, action, resolutionNote } = payload;

  try {
    const envelope = await apiClient.post<ApiResponseEnvelope<AbuseReportItem>>(
      "/api/admin/reviews",
      {
        itemType: "report",
        id: reportId,
        action,
        resolutionNote,
      }
    );
    if (envelope?.data) {
      updateLocalReport(envelope.data);
      return envelope.data;
    }
  } catch {
    // Fallback locally
  }

  const queue = getLocalFallbackData();
  const target = queue.abuseReports.find((r) => r.id === reportId);
  if (!target) {
    throw new Error(`Abuse report ${reportId} not found`);
  }

  const updated: AbuseReportItem = {
    ...target,
    status: action === "remove_review" ? "resolved" : "dismissed",
    resolutionAction: action,
    resolutionNote: resolutionNote ?? (action === "remove_review" ? "Review removed due to community violation" : "Report dismissed - content complies with guidelines"),
    resolvedAt: new Date().toISOString(),
    resolvedBy: "Admin Curator",
  };

  const updatedReports = queue.abuseReports.map((r) =>
    r.id === reportId ? updated : r
  );
  const nextData: ModerationQueueData = {
    ...queue,
    abuseReports: updatedReports,
    stats: calculateStats(queue.pendingReviews, updatedReports),
  };
  saveStoredQueue(nextData);
  return updated;
}

function updateLocalReview(item: PendingReviewItem) {
  const queue = getLocalFallbackData();
  const updatedReviews = queue.pendingReviews.map((r) =>
    r.id === item.id ? item : r
  );
  saveStoredQueue({
    ...queue,
    pendingReviews: updatedReviews,
    stats: calculateStats(updatedReviews, queue.abuseReports),
  });
}

function updateLocalReport(item: AbuseReportItem) {
  const queue = getLocalFallbackData();
  const updatedReports = queue.abuseReports.map((r) =>
    r.id === item.id ? item : r
  );
  saveStoredQueue({
    ...queue,
    abuseReports: updatedReports,
    stats: calculateStats(queue.pendingReviews, updatedReports),
  });
}

/**
 * Resets moderation queue data to initial demo state.
 */
export function resetModerationQueue(): ModerationQueueData {
  const initialData: ModerationQueueData = {
    pendingReviews: INITIAL_PENDING_REVIEWS,
    abuseReports: INITIAL_ABUSE_REPORTS,
    stats: calculateStats(INITIAL_PENDING_REVIEWS, INITIAL_ABUSE_REPORTS),
  };
  saveStoredQueue(initialData);
  return initialData;
}
