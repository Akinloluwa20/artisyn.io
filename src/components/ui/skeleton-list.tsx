"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton-card";

/**
 * Placeholder for a list of rows while its data resolves.
 *
 * Renders `count` default rows (a leading media block, a two-line text column
 * and a trailing block, mirroring the app's list rows). Pass `renderItem` to
 * draw a different row shape instead, e.g. a transaction row with a
 * right-aligned amount.
 */
export interface SkeletonListProps {
  /** How many placeholder rows to render. */
  count?: number;
  /** Custom row renderer. Falls back to {@link SkeletonListItem}. */
  renderItem?: (index: number) => ReactNode;
  /** Accessible label announced while the list is a placeholder. */
  label?: string;
  className?: string;
}

export interface SkeletonListItemProps {
  showMedia?: boolean;
  showAside?: boolean;
  className?: string;
}

/** A single default skeleton row. */
export function SkeletonListItem({
  showMedia = true,
  showAside = true,
  className,
}: SkeletonListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {showMedia ? <Skeleton className="size-10 shrink-0" /> : null}

      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      {showAside ? <Skeleton className="h-5 w-20 shrink-0" /> : null}
    </div>
  );
}

export function SkeletonList({
  count = 3,
  renderItem,
  label = "Loading",
  className,
}: SkeletonListProps) {
  const rows = Math.max(0, count);

  return (
    <div
      data-slot="skeleton-list"
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: rows }).map((_, index) =>
        renderItem ? (
          <div key={index}>{renderItem(index)}</div>
        ) : (
          <SkeletonListItem key={index} />
        ),
      )}
    </div>
  );
}
