"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { VerificationStatusBadge } from "@/components/verification/verification-status-badge";
import { VerificationTimeline } from "@/components/verification/verification-timeline";
import {
	ApiClientError,
	getCuratorVerificationStatus,
	type CuratorVerificationStatusResponse,
} from "@/lib/api";

const LOAD_ERROR_MESSAGE = "Unable to load your verification status.";

function describeLoadError(err: unknown): string {
	return err instanceof ApiClientError ? err.message : LOAD_ERROR_MESSAGE;
}

function formatDateTime(value?: string): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function StatusSkeleton() {
	return (
		<div className="space-y-6" aria-hidden="true">
			<div className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white" />
			<div className="h-64 animate-pulse rounded-xl border border-gray-100 bg-white" />
		</div>
	);
}

export default function CuratorVerificationStatusPage() {
	const [data, setData] = useState<CuratorVerificationStatusResponse | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			setData(await getCuratorVerificationStatus());
		} catch (err) {
			setError(describeLoadError(err));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		// Initial load only. The state updates happen after the `await` inside the
		// inline async IIFE, so nothing is set synchronously in the effect body —
		// which is what `react-hooks/set-state-in-effect` rejects. The refresh
		// button below keeps using `load`, which runs as an event handler.
		let cancelled = false;

		(async () => {
			try {
				const status = await getCuratorVerificationStatus();
				if (!cancelled) {
					setData(status);
					setError(null);
				}
			} catch (err) {
				if (!cancelled) setError(describeLoadError(err));
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<AuthGuard>
			<main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl space-y-6">
					<header className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-semibold text-gray-900">
								Verification status
							</h1>
							<p className="mt-1 text-sm text-gray-500">
								Track your curator application and review history.
							</p>
						</div>
						<Button asChild variant="outline" size="sm">
							<Link href="/curator/verification">Submit new application</Link>
						</Button>
					</header>

					{isLoading ? (
						<StatusSkeleton />
					) : error ? (
						<section
							role="alert"
							className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700"
						>
							<p className="flex items-start gap-2 text-sm">
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
								{error}
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void load()}
								className="gap-2"
							>
								<RefreshCw className="h-4 w-4" />
								Try again
							</Button>
						</section>
					) : data ? (
						<>
							<section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p className="text-sm text-gray-500">Current status</p>
										<div className="mt-2">
											<VerificationStatusBadge
												status={data.status}
												size="lg"
											/>
										</div>
									</div>

									{data.current && (
										<dl className="grid gap-2 text-sm">
											<div>
												<dt className="text-gray-500">Submitted</dt>
												<dd className="font-medium text-gray-900">
													{formatDateTime(data.current.submittedAt)}
												</dd>
											</div>
											<div>
												<dt className="text-gray-500">Last reviewed</dt>
												<dd className="font-medium text-gray-900">
													{formatDateTime(data.current.reviewedAt)}
												</dd>
											</div>
										</dl>
									)}
								</div>

								{data.status === "rejected" &&
									Boolean(data.current?.rejectionReasons?.length) && (
										<div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
											<p className="text-sm font-semibold text-rose-800">
												Why was it rejected?
											</p>
											<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-rose-700">
												{data.current?.rejectionReasons?.map((reason) => (
													<li key={reason}>{reason}</li>
												))}
											</ul>
										</div>
									)}

								{data.status === "not_submitted" && (
									<p className="mt-4 text-sm text-gray-600">
										You have not submitted a curator verification application
										yet.
									</p>
								)}
							</section>

							<section className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<h2 className="text-lg font-semibold text-gray-900">
										Submission history
									</h2>
									<span className="text-sm text-gray-500">
										{data.history.length}{" "}
										{data.history.length === 1
											? "submission"
											: "submissions"}
									</span>
								</div>

								{data.history.length > 0 ? (
									<VerificationTimeline records={data.history} />
								) : (
									<p className="text-sm text-gray-600">
										No submissions yet.{" "}
										<Link
											href="/curator/verification"
											className="font-medium text-[#605DEC] hover:underline"
										>
											Start your application
										</Link>
										.
									</p>
								)}
							</section>
						</>
					) : null}
				</div>
			</main>
		</AuthGuard>
	);
}
