"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Search,
  Heart,
  Briefcase,
  Users,
  Settings,
  ArrowRight,
  Inbox,
  Clock,
} from "lucide-react";
import { useApplications } from "@/lib/hooks";
import { ARTISAN_SEARCH_RESULTS } from "@/components/search/artisan-search-data";

const SAVED_STORAGE_KEY = "artisyn.savedArtisans";
const DEFAULT_SAVED_COUNT = ARTISAN_SEARCH_RESULTS.slice(0, 3).length;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSavedArtisansCount(): number {
  if (typeof window === "undefined") return DEFAULT_SAVED_COUNT;
  try {
    const stored = localStorage.getItem(SAVED_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]).length : DEFAULT_SAVED_COUNT;
  } catch {
    return DEFAULT_SAVED_COUNT;
  }
}

const getServerSnapshot = (): number => DEFAULT_SAVED_COUNT;

export default function ClientDashboardPage() {
  const { data: applications, isLoading: isLoadingApplications } = useApplications();
  const savedCount = useSyncExternalStore(
    subscribe,
    getSavedArtisansCount,
    getServerSnapshot
  );

  const summaryCards = [
    {
      title: "Applications",
      value: isLoadingApplications ? "…" : String(applications?.length ?? 0),
      subtitle: "Review applicant proposals & hires",
      icon: Briefcase,
      href: "/client/applications",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Saved Artisans",
      value: String(savedCount),
      subtitle: "Shortlisted professionals",
      icon: Heart,
      href: "/client/saved-artisans",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      title: "Browse Artisans",
      value: `${ARTISAN_SEARCH_RESULTS.length}+`,
      subtitle: "Explore vetted local talent",
      icon: Search,
      href: "/search",
      color: "text-[#605DEC]",
      bgColor: "bg-[#F4F3FE]",
    },
  ];

  const quickActions = [
    {
      title: "Search Artisans",
      description: "Browse our network of vetted professionals across skills and locations.",
      icon: Search,
      href: "/search",
    },
    {
      title: "Review Applications",
      description: "Evaluate candidate submissions, review profiles, and manage hires.",
      icon: Users,
      href: "/client/applications",
    },
    {
      title: "Saved Artisans",
      description: "Quickly access and connect with artisans you have bookmarked.",
      icon: Heart,
      href: "/client/saved-artisans",
    },
    {
      title: "Account Settings",
      description: "Manage your notification preferences, privacy options, and security.",
      icon: Settings,
      href: "/client/settings",
    },
  ];

  const recentApplications = applications?.slice(0, 3) ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Client Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Welcome back! Manage your searches, applications, and saved artisans.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#605DEC] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5558e3] self-start sm:self-auto"
        >
          <Search className="w-4 h-4" />
          Find Artisans
        </Link>
      </div>

      {/* Summary Cards */}
      <section>
        <h2 className="sr-only">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link key={index} href={card.href} className="block group">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#605DEC]/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{card.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${card.bgColor}`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href} className="block group">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#605DEC]/40 flex items-start gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg group-hover:bg-[#F4F3FE] transition-colors">
                    <Icon className="w-6 h-6 text-slate-600 group-hover:text-[#605DEC]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center justify-between">
                      {action.title}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#605DEC] group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Activity Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Applications</h2>
          <Link
            href="/client/applications"
            className="text-sm font-medium text-[#605DEC] hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoadingApplications ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ) : recentApplications.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {recentApplications.map((app) => {
              const status = app.status ?? "pending";
              return (
                <div
                  key={app.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900">{app.jobTitle}</p>
                    <p className="text-sm text-slate-600">Applicant: {app.applicant}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Applied on {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium border capitalize ${
                        STATUS_STYLES[status] || STATUS_STYLES.pending
                      }`}
                    >
                      {status}
                    </span>
                    <Link
                      href="/client/applications"
                      className="text-xs font-medium text-[#605DEC] hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-medium text-slate-900">No applications received yet</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              When artisans submit proposals for your job listings, their activity and applications will appear here.
            </p>
            <div className="mt-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#605DEC] hover:underline"
              >
                Discover and invite artisans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
