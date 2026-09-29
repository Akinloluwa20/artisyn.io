import { SkeletonCard, Skeleton } from "@/components/ui/skeleton-card";
import { SkeletonList } from "@/components/ui/skeleton-list";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-gray-200 p-5 space-y-4">
        {/* Logo */}
        <Skeleton className="h-10 w-28 rounded-lg" />
        {/* Nav items */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 p-6 lg:p-8">
        {/* Page header */}
        <div className="space-y-2 mb-8">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard
              key={i}
              className="h-28 rounded-2xl"
              label={`Loading statistic ${i + 1}`}
              lines={1}
              showAside
            />
          ))}
        </div>

        {/* Content block */}
        <SkeletonList count={4} label="Loading dashboard content" />
      </main>
    </div>
  );
}
