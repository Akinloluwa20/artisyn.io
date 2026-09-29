import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  INITIAL_PENDING_REVIEWS,
  INITIAL_ABUSE_REPORTS,
  type ModerationQueueData,
  type PendingReviewItem,
  type AbuseReportItem,
  type ModerationStats,
} from "@/lib/api/admin-reviews";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "moderation-queue.json");

// In-memory cache for fast access & serverless environments
let memoryQueue: ModerationQueueData | null = null;

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

async function getQueueData(): Promise<ModerationQueueData> {
  if (memoryQueue) {
    return memoryQueue;
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as ModerationQueueData;
    if (parsed.pendingReviews && parsed.abuseReports) {
      parsed.stats = calculateStats(parsed.pendingReviews, parsed.abuseReports);
      memoryQueue = parsed;
      return parsed;
    }
  } catch {
    // File not found or unreadable, initialize
  }

  const initial: ModerationQueueData = {
    pendingReviews: INITIAL_PENDING_REVIEWS,
    abuseReports: INITIAL_ABUSE_REPORTS,
    stats: calculateStats(INITIAL_PENDING_REVIEWS, INITIAL_ABUSE_REPORTS),
  };

  memoryQueue = initial;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  } catch {
    // Ignore FS errors in constrained environments
  }

  return initial;
}

async function persistQueueData(data: ModerationQueueData): Promise<void> {
  data.stats = calculateStats(data.pendingReviews, data.abuseReports);
  memoryQueue = data;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore write failures gracefully
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab"); // "reviews" | "reports" | "all"
  const queue = await getQueueData();

  if (tab === "reviews") {
    return NextResponse.json({
      success: true,
      data: {
        pendingReviews: queue.pendingReviews,
        stats: queue.stats,
      },
    });
  }

  if (tab === "reports") {
    return NextResponse.json({
      success: true,
      data: {
        abuseReports: queue.abuseReports,
        stats: queue.stats,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: queue,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemType, id, action, resolutionNote } = body;

    if (!itemType || !id || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: itemType, id, and action are required",
        },
        { status: 400 }
      );
    }

    const queue = await getQueueData();

    if (itemType === "review") {
      if (action !== "approve" && action !== "reject") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action for review: must be 'approve' or 'reject'",
          },
          { status: 400 }
        );
      }

      const reviewIndex = queue.pendingReviews.findIndex((r) => r.id === id);
      if (reviewIndex === -1) {
        return NextResponse.json(
          { success: false, error: `Review with id '${id}' not found` },
          { status: 404 }
        );
      }

      const updatedReview: PendingReviewItem = {
        ...queue.pendingReviews[reviewIndex],
        status: action === "approve" ? "approved" : "rejected",
        resolutionNote:
          resolutionNote ||
          (action === "approve"
            ? "Approved for publication by admin moderation"
            : "Review rejected by admin moderation"),
        moderatedAt: new Date().toISOString(),
        moderatedBy: "Admin Curator",
      };

      queue.pendingReviews[reviewIndex] = updatedReview;
      await persistQueueData(queue);

      return NextResponse.json({
        success: true,
        data: updatedReview,
        stats: queue.stats,
      });
    }

    if (itemType === "report") {
      if (action !== "remove_review" && action !== "dismiss") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid action for abuse report: must be 'remove_review' or 'dismiss'",
          },
          { status: 400 }
        );
      }

      const reportIndex = queue.abuseReports.findIndex((r) => r.id === id);
      if (reportIndex === -1) {
        return NextResponse.json(
          { success: false, error: `Abuse report with id '${id}' not found` },
          { status: 404 }
        );
      }

      const updatedReport: AbuseReportItem = {
        ...queue.abuseReports[reportIndex],
        status: action === "remove_review" ? "resolved" : "dismissed",
        resolutionAction: action,
        resolutionNote:
          resolutionNote ||
          (action === "remove_review"
            ? "Report upheld: Review removed for community violation"
            : "Report dismissed: Review complies with content guidelines"),
        resolvedAt: new Date().toISOString(),
        resolvedBy: "Admin Curator",
      };

      queue.abuseReports[reportIndex] = updatedReport;
      await persistQueueData(queue);

      return NextResponse.json({
        success: true,
        data: updatedReport,
        stats: queue.stats,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid itemType: must be 'review' or 'report'",
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal moderation error occurred",
      },
      { status: 500 }
    );
  }
}
