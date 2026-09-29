"use client";

import { useState } from "react";

import {
	updateApplicationStatus,
	type Application,
	type ApplicationStatus,
} from "@/lib/api/applications";
import { useApplications } from "@/lib/hooks";
import { useToast } from "@/context/ToastProvider";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
	pending: "bg-amber-50 text-amber-700",
	accepted: "bg-emerald-50 text-emerald-700",
	rejected: "bg-rose-50 text-rose-700",
};

function groupByListing(applications: Application[]) {
	return applications.reduce<Record<string, Application[]>>((groups, app) => {
		(groups[app.jobTitle] ??= []).push(app);
		return groups;
	}, {});
}

export default function ClientApplicationsPage() {
	const { data, isLoading, error, refetch } = useApplications();
	const [pendingId, setPendingId] = useState<string | null>(null);
	const toast = useToast();

	const setStatus = async (id: string, status: ApplicationStatus) => {
		setPendingId(id);
		try {
			await updateApplicationStatus(id, status);
			await refetch();
			toast.success(`Application ${status}.`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Update failed.");
		} finally {
			setPendingId(null);
		}
	};

	const groups = Object.entries(groupByListing(data ?? []));

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
				<p className="mt-1 text-sm text-gray-500">
					Review candidates for your listings and accept or reject them.
				</p>
			</header>

			{isLoading ? (
				<p className="text-sm text-gray-500">Loading applications…</p>
			) : error ? (
				<p role="alert" className="text-sm text-rose-600">
					{error.message}
				</p>
			) : groups.length === 0 ? (
				<section className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
					No applications yet.
				</section>
			) : (
				groups.map(([listing, applications]) => (
					<section
						key={listing}
						className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
					>
						<h2 className="font-semibold text-gray-900">
							{listing}{" "}
							<span className="text-sm font-normal text-gray-500">
								({applications.length})
							</span>
						</h2>
						<ul className="mt-4 divide-y divide-gray-100">
							{applications.map((app) => {
								const status = app.status ?? "pending";
								const busy = pendingId === app.id;
								return (
									<li
										key={app.id}
										className="flex flex-wrap items-center justify-between gap-3 py-3"
									>
										<div>
											<p className="text-sm font-medium text-gray-900">
												{app.applicant}
											</p>
											<p className="text-xs text-gray-500">
												Applied {new Date(app.createdAt).toLocaleDateString()}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span
												className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
											>
												{status}
											</span>
											<button
												type="button"
												disabled={busy || status === "accepted"}
												onClick={() => setStatus(app.id, "accepted")}
												className="rounded-md bg-[#605DEC] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5558e3] disabled:cursor-not-allowed disabled:opacity-50"
											>
												Accept
											</button>
											<button
												type="button"
												disabled={busy || status === "rejected"}
												onClick={() => setStatus(app.id, "rejected")}
												className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Reject
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					</section>
				))
			)}
		</div>
	);
}
