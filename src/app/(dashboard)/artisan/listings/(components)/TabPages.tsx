"use client";

import { useState, Suspense } from "react";
import JobCard from "./JobCard";
import AppliedJobsList from "./AppliedJobsList";
import { jobs } from "../dummyjobs";
import Image from "next/image";
import bgImg from "../(assets)/bg.png";
import CompletedJobsList from "./CompletedJobsList";
import { SkeletonList } from "@/components/ui/skeleton-list";

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-20 text-center text-sm text-gray-500">
    {text}
  </div>
);

const ActiveJobCard = () => {
  const activeJobs = jobs.filter((job) => job.status === "active");

  if (activeJobs.length === 0) {
    return <EmptyState text="No active jobs yet." />;
  }

  return (
    <div className="mt-8">
      {activeJobs.map((info, index) => (
        <div key={index} className="flex mb-4 lg:flex-row md:flex-row flex-col">
          <div className="lg:w-[12%] md:w-[20%] w-full lg:mr-6 md:mr-4 mr-0">
            <Image src={bgImg} alt="" width={200} height={200} className="w-full" />
          </div>
          <div className="lg:w-[70%] md:w-[70%] w-full flex flex-col lg:my-0 md:my-0 my-3">
            <div className="flex lg:justify-between lg:items-center md:justify-between md:items-center lg:flex-row md:flex-row flex-col">
              <div>
                <p className="text-[12px] text-[#212121]">In Progress</p>
                <h2 className="lg:text-[20px] md:text-[18px] text-[16px] font-semibold">
                  {info.shortDescription}
                </h2>
              </div>
              <span className="border rounded-md py-2 text-[14px] px-6 lg:my-0 md:my-0 my-3 text-green-600 border-green-600">
                Active
              </span>
            </div>
            <div className="text-[14px] flex justify-between lg:items-center md:items-center mt-auto text-[#777679] flex-col lg:flex-row md:flex-row">
              <p>Category: {info.category} <span className="mx-4">|</span></p>
              <p>Compensation: {info.budget} <span className="mx-4">|</span></p>
              <p>Location: {info.location} <span className="mx-4">|</span></p>
              <p>
                Urgency:{" "}
                <span className="uppercase text-red-500">{info.urgency}</span>
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const TabPages = () => {
  const [activeTab, setActiveTab] = useState("available");

  const tabs = [
    { value: "available", label: "Available Jobs" },
    { value: "active", label: "Active Jobs" },
    { value: "applied", label: "Applied" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="w-full">
      <div className="border-b border-[#BDBCDB]">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                pb-3 px-1 text-sm font-medium transition-all relative
                ${
                  activeTab === tab.value
                    ? "text-[#605DEC]"
                    : "text-[#6B6878] hover:text-gray-900"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#605DEC] shadow-[0_2px_4px_rgba(37,99,235,0.4)]" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {activeTab === "available" && (
          <Suspense fallback={<SkeletonList className="mt-4" count={3} label="Loading jobs" />}>
            <JobCard />
          </Suspense>
        )}
        {activeTab === "active" && <ActiveJobCard />}
        {activeTab === "applied" && <AppliedJobsList />}
        {activeTab === "completed" && <CompletedJobsList />}
      </div>
    </div>
  );
};

export default TabPages;