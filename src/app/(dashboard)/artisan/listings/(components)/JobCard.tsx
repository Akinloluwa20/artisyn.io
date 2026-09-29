'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';

import Image from 'next/image';
import type { Job } from '@/lib/api/jobs';
import JobFilter from './JobFilters';
import Link from 'next/link';
import bgImg from '../(assets)/bg.png';
import { useWallet } from '@/context/WalletProvider';
import { useCreateApplication, useJobs } from '@/lib/hooks';
import { ApiClientError } from '@/lib/api/errors';

interface JobFiltersValue {
  search: string;
  role: string | null;
  urgency: string | null;
}

const DEFAULT_FILTERS: JobFiltersValue = {
  search: '',
  role: null,
  urgency: null,
};

const JobCard = () => {
  const { data, isLoading, error, refetch } = useJobs<Job>({
    status: 'available',
  });
  const { mutate: submitApplication } = useCreateApplication();
  const { publicKey, connected } = useWallet();
  const [filters, setFilters] = useState<JobFiltersValue>(DEFAULT_FILTERS);
  const [_, setStatusMap] = useState<
    Record<number, { state: string; message?: string }>
  >({});

  const jobs = useMemo(() => data?.jobs ?? [], [data]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        job.shortDescription
          .toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchesRole = filters.role
        ? job.title.toLowerCase().includes(filters.role.toLowerCase())
        : true;

      const matchesUrgency = filters.urgency
        ? job.urgency === filters.urgency
        : true;

      return matchesSearch && matchesRole && matchesUrgency;
    });
  }, [jobs, filters]);

  const applyToJob = async (job: Job, idx: number) => {
    if (!connected || !publicKey) {
      setStatusMap((s) => ({
        ...s,
        [idx]: { state: 'error', message: 'Connect your wallet to apply.' },
      }));
      return;
    }

    setStatusMap((s) => ({ ...s, [idx]: { state: 'loading' } }));

    try {
      await submitApplication({
        jobTitle: job.title,
        jobShortDescription: job.shortDescription,
        location: job.location,
        applicant: publicKey,
      });

      setStatusMap((s) => ({
        ...s,
        [idx]: { state: 'success', message: 'Application submitted.' },
      }));
    } catch (err) {
      if (err instanceof ApiClientError && err.isStatus(409)) {
        setStatusMap((s) => ({
          ...s,
          [idx]: { state: 'duplicate', message: 'You have already applied.' },
        }));
      } else {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Failed to submit application.';
        setStatusMap((s) => ({
          ...s,
          [idx]: { state: 'error', message },
        }));
      }
    }
  };

  void applyToJob;

  const handleFilterChange = useCallback((next: JobFiltersValue) => {
    setFilters(next);
  }, []);

  return (
    <div>
      {/* Suspense is required, useSearchParams needs it */}
      <Suspense
        fallback={
          <div className="text-sm text-gray-400">Loading filters...</div>
        }
      >
        <JobFilter onFilterChange={handleFilterChange} roles={Array.from(new Set(jobs.map((job) => job.title)))} />
      </Suspense>

      {isLoading && <p className="mt-8 text-sm text-gray-400">Loading available jobs...</p>}

      {error && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="mt-8">
          {filteredJobs.map((info, index) => (
            <div
              key={index}
              className="flex mb-4 lg:flex-row md:flex-row flex-col"
            >
              <div className="lg:w-[12%] md:w-[20%] w-full lg:mr-6 md:mr-4 mr-0">
                <Image
                  src={bgImg}
                  alt=""
                  width={200}
                  height={200}
                  className="w-full"
                />
              </div>

              <div className="lg:w-[70%] md:w-[70%] w-full flex flex-col lg:my-0 md:my-0 my-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center md:flex-row md:justify-between md:items-center">
                  <div>
                    <p className="text-[12px] text-[#212121]">
                      Posted 2 mins ago
                    </p>
                    <h2 className="lg:text-[20px] md:text-[18px] text-[16px] font-semibold">
                      {info.shortDescription}
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href={`/artisan/jobs/${info.id}`}
                      className="text-sm font-medium text-[#605DEC] hover:underline"
                    >
                      View details
                    </Link>
                    <button
                      onClick={() => alert('Application sent!')}
                      className="border rounded-md py-2 hover:bg-black hover:text-white text-[14px] px-6"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="text-[14px] flex justify-between lg:items-center md:items-center mt-auto text-[#777679] flex-col lg:flex-row md:flex-row">
                  <p>
                    Category: {info.category} <span className="mx-4">|</span>
                  </p>
                  <p>
                    Compensation: {info.budget} <span className="mx-4">|</span>
                  </p>
                  <p>
                    Location: {info.location} <span className="mx-4">|</span>
                  </p>
                  <p>
                    Urgency:{' '}
                    <span className="uppercase text-red-500">
                      {info.urgency}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <p className="text-center text-gray-500 mt-10">
              No jobs match your filters
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default JobCard;
