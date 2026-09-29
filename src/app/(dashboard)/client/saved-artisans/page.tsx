"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, MapPin, Trash2 } from "lucide-react";

import { ARTISAN_SEARCH_RESULTS } from "@/components/search/artisan-search-data";

const STORAGE_KEY = "artisyn.savedArtisans";
const DEFAULT_SAVED_IDS = ARTISAN_SEARCH_RESULTS.slice(0, 3).map((a) => a.id);

function readSavedIds(): string[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? (JSON.parse(stored) as string[]) : DEFAULT_SAVED_IDS;
	} catch {
		return DEFAULT_SAVED_IDS;
	}
}

export default function SavedArtisansPage() {
	const [savedIds, setSavedIds] = useState<string[]>(readSavedIds);
	const saved = ARTISAN_SEARCH_RESULTS.filter((a) => savedIds.includes(a.id));

	const remove = (id: string) => {
		const next = savedIds.filter((savedId) => savedId !== id);
		setSavedIds(next);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	};

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold text-gray-900">Saved Artisans</h1>
				<p className="mt-1 text-sm text-gray-500">
					Revisit the artisans you have shortlisted.
				</p>
			</header>

			{saved.length === 0 ? (
				<section className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
					<p className="text-sm text-gray-600">You have no saved artisans yet.</p>
					<Link
						href="/search"
						className="mt-3 inline-block text-sm font-medium text-[#605DEC] hover:underline"
					>
						Browse artisans
					</Link>
				</section>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{saved.map((artisan) => (
						<li
							key={artisan.id}
							className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
						>
							<div
								className="h-40 w-full bg-cover bg-center"
								style={{ backgroundImage: `url(${artisan.image})` }}
							/>
							<div className="space-y-3 p-4">
								<div>
									<h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
										{artisan.name}
										{artisan.verified && (
											<BadgeCheck className="size-4 text-[#605DEC]" />
										)}
									</h2>
									<p className="text-sm text-gray-500">{artisan.category}</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
										<MapPin className="size-3.5" />
										{artisan.location}
									</p>
								</div>
								<div className="flex gap-2">
									<Link
										href={`/artisans/${artisan.id}`}
										className="flex-1 rounded-md bg-[#605DEC] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#5558e3]"
									>
										View profile
									</Link>
									<button
										type="button"
										onClick={() => remove(artisan.id)}
										aria-label={`Remove ${artisan.name} from saved`}
										className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
									>
										<Trash2 className="size-4" />
										Remove
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
