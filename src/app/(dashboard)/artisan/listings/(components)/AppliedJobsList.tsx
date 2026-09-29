"use client";

import Image from "next/image";
import bgImg from "../(assets)/bg.png";
import { useApplications } from "@/lib/hooks";
import { SkeletonList } from "@/components/ui/skeleton-list";

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  state: string;
  appliedAt: string;
  updatedAt: string;
}

const AppliedJobsList = () => {
  const { data, isLoading, error, refetch } = useApplications();

  const applications: Application[] = (data ?? []).map((app) => ({
    id: app.id,
    jobId: app.id,
    jobTitle: app.jobTitle,
    company: app.applicant,
    state: "Applied",
    appliedAt: app.createdAt,
    updatedAt: app.createdAt,
  }));

  if (isLoading) {
    return <SkeletonList className="mt-8" count={3} label="Loading applications" />;
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        <p>{error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return <div className="py-20 text-center text-sm text-gray-500">No applied jobs yet.</div>;
  }

  return (
    <div className="mt-8 space-y-4">
      {applications.map((app) => (
        <div key={app.id} className="flex mb-4 lg:flex-row md:flex-row flex-col border border-gray-100 p-4 rounded-lg shadow-sm">
          <div className="lg:w-[12%] md:w-[20%] w-full lg:mr-6 md:mr-4 mr-0 flex items-center">
            <Image
              src={bgImg}
              alt=""
              width={200}
              height={200}
              className="w-full rounded"
            />
          </div>

          <div className="lg:w-[85%] md:w-[80%] w-full flex flex-col lg:my-0 md:my-0 my-3">
            <div className="flex lg:justify-between lg:items-center md:justify-between md:items-center lg:flex-row md:flex-row flex-col">
              <div>
                <p className="text-[12px] text-[#212121]">
                  Applied: {new Date(app.appliedAt).toLocaleDateString()}
                </p>
                <h2 className="lg:text-[20px] md:text-[18px] text-[16px] font-semibold">
                  {app.jobTitle}
                </h2>
                <p className="text-[14px] text-gray-600 mt-1">{app.company}</p>
              </div>
              
              <div className="lg:my-0 md:my-0 my-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                  app.state === 'Applied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  app.state === 'In Review' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  app.state === 'Interviewing' ? 'bg-green-50 text-green-700 border-green-200' :
                  app.state === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {app.state}
                </span>
              </div>
            </div>

            <div className="text-[12px] text-[#777679] mt-auto pt-4 flex flex-col lg:flex-row md:flex-row">
              <p>
                Last updated: {new Date(app.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppliedJobsList;
