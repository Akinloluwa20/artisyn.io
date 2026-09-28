'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  TrendingUp,
  Briefcase,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import bgImg from '../listings/(assets)/bg.png';
import { jobs } from '../listings/dummyjobs';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton-card';
import { SkeletonList } from '@/components/ui/skeleton-list';
import {
  fetchDashboardMetrics,
  type DashboardMetrics,
} from '@/lib/api/dashboard';

// ─── Loading skeleton ────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard
          key={i}
          label={`Loading metric ${i + 1}`}
          lines={1}
          showAside
        />
      ))}
    </div>
  );
}

function ProfilePerformanceSkeleton() {
  return (
    <div className="divide-y divide-gray-200">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ))}
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
          Could not load dashboard metrics
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyMetrics() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">No metrics available yet</p>
      <p className="text-sm text-gray-400 mt-1">
        Complete your first job to start seeing performance data here.
      </p>
    </div>
  );
}

export default function ArtisanDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bumped by the retry button to re-run the fetch effect below.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchDashboardMetrics();
        if (!cancelled) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  // Sample available jobs (still from local data until jobs API is wired up)
  const availableJobsPreview = jobs.slice(0, 4);
  const activeJobsData = jobs.slice(0, 2);

  const artisanName = metrics?.artisanName ?? 'Artisan';

  return (
    <div className="w-full">
      {/* Greeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {loading ? (
            <span className="inline-block h-9 w-64 bg-gray-200 rounded animate-pulse" />
          ) : (
            <>Welcome back, {artisanName} 👋</>
          )}
        </h1>
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={handleRetry} />}

      {/* Stats Overview Row */}
      <section className="mb-8">
        {loading ? (
          <MetricsSkeleton />
        ) : !metrics ? (
          <EmptyMetrics />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Earnings */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {metrics.totalEarnings}
                  </h3>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <a
                href="#"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-3 inline-block"
              >
                View Earnings →
              </a>
            </div>

            {/* Active Jobs */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {metrics.activeJobs}
                  </h3>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Jobs</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {metrics.completedJobs}
                  </h3>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Average Rating</p>
              <div className="flex items-baseline gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {metrics.averageRating}
                </h3>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Two Column Layout: Available Jobs (Left) + Profile Performance & Active Jobs (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Jobs Section (Left - takes 2 columns on lg) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Available Jobs
              </h2>
              <Link
                href="/artisan/jobs"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View All →
              </Link>
            </div>

            {/* Jobs List */}
            <div className="divide-y divide-gray-200">
              {availableJobsPreview.map((job, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Job Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={bgImg}
                        alt={job.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        Posted 1 min ago
                      </p>
                      <JobStatusBadge
                        status="available"
                        size="sm"
                        className="mb-2"
                      />
                      <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                        {job.shortDescription}
                      </h3>
                      <div className="text-xs text-gray-600">
                        <div className="flex flex-wrap gap-2">
                          <span>Category: {job.category}</span>
                          <span>•</span>
                          <span>Compensation: {job.budget}</span>
                          <span>•</span>
                          <span>Location: {job.location}</span>
                          <span>•</span>
                          <span className="uppercase font-medium text-red-600">
                            {job.urgency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Profile Performance + Active Jobs */}
        <div className="space-y-6">
          {/* Profile Performance Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Profile Performance
              </h2>
              <a
                href="/artisan/profile"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Go to Profile →
              </a>
            </div>

            {/* Content */}
            {loading ? (
              <ProfilePerformanceSkeleton />
            ) : !metrics ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No performance data available.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Profile views</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metrics.profileViews}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-1">
                    Search appearances
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metrics.searchAppearances}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Client saves</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metrics.clientSaves}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-1">
                    Proposal response rate
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {metrics.proposalResponseRate}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Active Jobs Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Active Jobs
              </h2>
              <Link
                href="/artisan/jobs"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View All →
              </Link>
            </div>

            {/* Jobs List */}
            <div className="divide-y divide-gray-200">
              {loading ? (
                <SkeletonList
                  className="space-y-0 divide-y divide-gray-200 rounded-none"
                  count={3}
                  label="Loading active jobs"
                  renderItem={() => (
                    <div className="flex gap-3 p-4">
                      <Skeleton className="size-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  )}
                />
              ) : activeJobsData.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  No active jobs at the moment.
                </div>
              ) : (
                activeJobsData.map((job, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Job Image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={bgImg}
                          alt={job.title}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">
                          Started 1 day ago
                        </p>
                        <JobStatusBadge
                          status="active"
                          size="sm"
                          variant="outline"
                          className="mb-2"
                        />
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {job.shortDescription}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
  // Mock data for earnings and metrics
  // const mockData = {
  //   totalEarnings: '₦120,000.00',
  //   activeJobs: 2,
  //   completedJobs: 12,
  //   averageRating: 4.5,
  //   profileViews: 124,
  //   searchAppearances: '1.2k',
  //   clientSaves: 18,
  //   proposalResponseRate: 95,
  // };

  // // State for jobs
  // const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  // const [activeJobsData, setActiveJobsData] = useState<Job[]>([]);
  // const [loading, setLoading] = useState(true);

  // // Fetch jobs from API (placeholder - will be updated when API endpoints are ready)
  // useEffect(() => {
  //   const fetchJobs = async () => {
  //     try {
  //       // For now, since there's no API endpoint for available/active jobs, we'll use empty arrays
  //       // This will be updated once the API is available
  //       setAvailableJobs([]);
  //       setActiveJobsData([]);
  //     } catch (error) {
  //       console.error('Failed to fetch jobs:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchJobs();
  // }, []);

  // return (
  //   <div className="w-full">
  //     {/* Greeting Header */}
  //     <div className="mb-8">
  //       <h1 className="text-3xl font-bold text-gray-900">
  //         Welcome back, Samuel 👋
  //       </h1>
  //     </div>

  //     {/* Stats Overview Row */}
  //     <section className="mb-8">
  //       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  //         {/* Total Earnings */}
  //         <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
  //           <div className="flex items-start justify-between">
  //             <div>
  //               <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
  //               <h3 className="text-2xl font-bold text-gray-900">
  //                 ₦120,000.00
  //               </h3>
  //             </div>
  //           </div>
  //           <a
  //             href="#"
  //             className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-3 inline-block"
  //           >
  //             View Earnings →
  //           </a>
  //         </div>

  //         {/* Active Jobs */}
  //         <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
  //           <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
  //           <h3 className="text-2xl font-bold text-gray-900">
  //             {mockData.activeJobs}
  //           </h3>
  //         </div>

  //         {/* Completed Jobs */}
  //         <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
  //           <p className="text-sm text-gray-600 mb-1">Completed Jobs</p>
  //           <h3 className="text-2xl font-bold text-gray-900">
  //             {mockData.completedJobs}
  //           </h3>
  //         </div>

  //         {/* Average Rating */}
  //         <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
  //           <p className="text-sm text-gray-600 mb-1">Average Rating</p>
  //           <div className="flex items-baseline gap-2">
  //             <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
  //             <h3 className="text-2xl font-bold text-gray-900">
  //               {mockData.averageRating}
  //             </h3>
  //           </div>
  //         </div>
  //       </div>
  //     </section>

  //     {/* Two Column Layout: Available Jobs (Left) + Profile Performance & Active Jobs (Right) */}
  //     <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  //       {/* Available Jobs Section (Left - takes 2 columns on lg) */}
  //       <div className="lg:col-span-2">
  //         <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  //           {/* Header */}
  //           <div className="flex items-center justify-between p-4 border-b border-gray-200">
  //             <h2 className="text-xl font-semibold text-gray-900">
  //               Available Jobs
  //             </h2>
  //             <a
  //               href="/artisan/jobs"
  //               className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
  //             >
  //               View All →
  //             </a>
  //           </div>

  //           {/* Jobs List */}
  //           <div className="divide-y divide-gray-200">
  //             {loading ? (
  //               <div className="p-8 text-center text-sm text-gray-500">
  //                 Loading available jobs...
  //               </div>
  //             ) : availableJobs.length === 0 ? (
  //               <div className="p-8 text-center text-sm text-gray-500">
  //                 No available jobs at the moment
  //               </div>
  //             ) : (
  //               availableJobs.slice(0, 4).map((job, index) => (
  //                 <div
  //                   key={index}
  //                   className="p-4 hover:bg-gray-50 transition-colors"
  //                 >
  //                   <div className="flex gap-3">
  //                     {/* Job Image */}
  //                     <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
  //                       <Image
  //                         src={bgImg}
  //                         alt={job.title}
  //                         width={80}
  //                         height={80}
  //                         className="w-full h-full object-cover"
  //                       />
  //                     </div>

  //                     {/* Job Details */}
  //                     <div className="flex-1 min-w-0">
  //                       <p className="text-xs text-gray-500 mb-1">
  //                         Posted 1 min ago
  //                       </p>
  //                       <JobStatusBadge
  //                         status="available"
  //                         size="sm"
  //                         className="mb-2"
  //                       />
  //                       <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
  //                         {job.shortDescription}
  //                       </h3>
  //                       <div className="text-xs text-gray-600">
  //                         <div className="flex flex-wrap gap-2">
  //                           <span>Category: {job.category}</span>
  //                           <span>•</span>
  //                           <span>Compensation: {job.budget}</span>
  //                           <span>•</span>
  //                           <span>Location: {job.location}</span>
  //                           <span>•</span>
  //                           <span className="uppercase font-medium text-red-600">
  //                             {job.urgency}
  //                           </span>
  //                         </div>
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </div>
  //               ))
  //             )}
  //           </div>
  //         </div>
  //       </div>

  //       {/* Right Column: Profile Performance + Active Jobs */}
  //       <div className="space-y-6">
  //         {/* Profile Performance Section */}
  //         <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  //           {/* Header */}
  //           <div className="flex items-center justify-between p-4 border-b border-gray-200">
  //             <h2 className="text-xl font-semibold text-gray-900">
  //               Profile Performance
  //             </h2>
  //             <a
  //               href="/artisan/profile"
  //               className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
  //             >
  //               Go to Profile →
  //             </a>
  //           </div>

  //           {/* Content */}
  //           <div className="divide-y divide-gray-200">
  //             <div className="p-4">
  //               <p className="text-sm text-gray-600 mb-1">Profile views</p>
  //               <p className="text-lg font-semibold text-gray-900">
  //                 {mockData.profileViews}
  //               </p>
  //             </div>
  //             <div className="p-4">
  //               <p className="text-sm text-gray-600 mb-1">Search appearances</p>
  //               <p className="text-lg font-semibold text-gray-900">
  //                 {mockData.searchAppearances}
  //               </p>
  //             </div>
  //             <div className="p-4">
  //               <p className="text-sm text-gray-600 mb-1">Client saves</p>
  //               <p className="text-lg font-semibold text-gray-900">
  //                 {mockData.clientSaves}
  //               </p>
  //             </div>
  //             <div className="p-4">
  //               <p className="text-sm text-gray-600 mb-1">
  //                 Proposal response rate
  //               </p>
  //               <p className="text-lg font-semibold text-gray-900">
  //                 {mockData.proposalResponseRate}%
  //               </p>
  //             </div>
  //           </div>
  //         </div>

  //         {/* Active Jobs Section */}
  //         <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  //           {/* Header */}
  //           <div className="flex items-center justify-between p-4 border-b border-gray-200">
  //             <h2 className="text-xl font-semibold text-gray-900">
  //               Active Jobs
  //             </h2>
  //             <a
  //               href="/artisan/jobs"
  //               className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
  //             >
  //               View All →
  //             </a>
  //           </div>

  //           {/* Jobs List */}
  //           <div className="divide-y divide-gray-200">
  //             {loading ? (
  //               <div className="p-8 text-center text-sm text-gray-500">
  //                 Loading active jobs...
  //               </div>
  //             ) : activeJobsData.length === 0 ? (
  //               <div className="p-8 text-center text-sm text-gray-500">
  //                 No active jobs at the moment
  //               </div>
  //             ) : (
  //               activeJobsData.slice(0, 2).map((job, index) => (
  //                 <div
  //                   key={index}
  //                   className="p-4 hover:bg-gray-50 transition-colors"
  //                 >
  //                   <div className="flex gap-3">
  //                     {/* Job Image */}
  //                     <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
  //                       <Image
  //                         src={bgImg}
  //                         alt={job.title}
  //                         width={60}
  //                         height={60}
  //                         className="w-full h-full object-cover"
  //                       />
  //                     </div>

  //                     {/* Job Info */}
  //                     <div className="flex-1 min-w-0">
  //                       <p className="text-xs text-gray-500 mb-1">
  //                         Started 1 day ago
  //                       </p>
  //                       <JobStatusBadge
  //                         status="active"
  //                         size="sm"
  //                         variant="outline"
  //                         className="mb-2"
  //                       />
  //                       <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
  //                         {job.shortDescription}
  //                       </h3>
  //                     </div>
  //                   </div>
  //                 </div>
  //               ))
  //             )}
  //           </div>
  //         </div>
  //       </div>
  //     </section>
  //   </div>
  // );
}
