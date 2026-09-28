import { Skeleton } from "@/components/ui/skeleton-card";
import { SkeletonList } from "@/components/ui/skeleton-list";

export default function JobsLoading() {
  return (
    <main className="my-8 px-4">
      <Skeleton className="mb-4 h-7 w-32 rounded" />
      <div className="w-full">
        {/* Tab strip */}
        <div className="flex gap-6 border-b border-[#BDBCDB]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-5 w-24" />
          ))}
        </div>
        <SkeletonList className="mt-4" count={4} label="Loading jobs" />
      </div>
    </main>
  );
}
