import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-card";
import { SkeletonList } from "@/components/ui/skeleton-list";

export default function ArtisanProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Hero */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
      </div>

      {/* About / details */}
      <SkeletonCard
        className="mb-6"
        label="Loading profile details"
        lines={3}
        showMedia={false}
      />

      {/* Portfolio */}
      <div className="mb-10">
        <Skeleton className="mb-4 h-6 w-40 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <Skeleton className="mb-4 h-6 w-32 rounded" />
        <SkeletonList count={3} label="Loading reviews" />
      </div>
    </main>
  );
}
