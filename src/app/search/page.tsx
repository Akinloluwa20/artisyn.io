"use client";

import { Suspense } from "react";
import { Search } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useDeferredValue, useMemo } from "react";

import {
  ARTISAN_SEARCH_CATEGORIES,
  ARTISAN_SEARCH_RESULTS,
} from "@/components/search/artisan-search-data";
import {
  FilterSidebar,
  type SearchFilterValue,
} from "@/components/search/filter-sidebar";
import { PaginationControl } from "@/components/search/pagination-control";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SortControl, type SearchSortValue } from "@/components/search/sort-control";
import { SuggestionsDropdown } from "@/components/search/suggestions-dropdown";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-card";

const PAGE_SIZE = 6;
const DEFAULT_SORT: SearchSortValue = "relevance";

const SORT_VALUES: SearchSortValue[] = [
  "relevance",
  "rating_desc",
  "newest",
  "price_asc",
  "price_desc",
];

function parsePage(value: string | null) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return Math.floor(parsedValue);
}

function parseFilters(searchParams: URLSearchParams): SearchFilterValue {
  const category = searchParams.get("category")?.trim() || undefined;
  const location = searchParams.get("location")?.trim() || undefined;
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const parsedMinPrice = minPrice ? Number(minPrice) : undefined;
  const parsedMaxPrice = maxPrice ? Number(maxPrice) : undefined;

  return {
    category,
    location,
    maxPrice: Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : undefined,
    minPrice: Number.isFinite(parsedMinPrice) ? parsedMinPrice : undefined,
    verifiedOnly: searchParams.get("verified") === "true" || undefined,
  };
}

function sortArtisans(
  artisans: typeof ARTISAN_SEARCH_RESULTS,
  sortValue: SearchSortValue
) {
  return [...artisans].sort((first, second) => {
    if (sortValue === "rating_desc") {
      return second.rating - first.rating;
    }

    if (sortValue === "newest") {
      return (
        ARTISAN_SEARCH_RESULTS.indexOf(second) -
        ARTISAN_SEARCH_RESULTS.indexOf(first)
      );
    }

    if (sortValue === "price_asc") {
      return first.price - second.price;
    }

    if (sortValue === "price_desc") {
      return second.price - first.price;
    }

    return first.name.localeCompare(second.name);
  });
}

function SearchPageFallback() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#020817] md:px-6 md:py-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <Skeleton className="h-11 w-full rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard
              key={i}
              className="rounded-xl border-[#E2E8F0] p-5"
              label={`Loading artisan result ${i + 1}`}
              lines={2}
              showAside
              showMedia
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function ArtisanSearchPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const term = searchParams.get("q") ?? "";
  const filters = parseFilters(new URLSearchParams(searchParams.toString()));
  const sortValue = SORT_VALUES.includes(
    (searchParams.get("sort") as SearchSortValue) ?? DEFAULT_SORT
  )
    ? ((searchParams.get("sort") as SearchSortValue) ?? DEFAULT_SORT)
    : DEFAULT_SORT;
  const currentPage = parsePage(searchParams.get("page"));
  const deferredTerm = useDeferredValue(term.trim().toLowerCase());

  const updateUrl = (
    updates: Record<string, string | number | boolean | undefined | null>,
    resetPage = false
  ) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === false
      ) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, String(value));
    });

    if (resetPage) {
      nextParams.delete("page");
    }

    const nextQueryString = nextParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.replace(
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
      { scroll: false }
    );
  };

  const filteredArtisans = useMemo(() => {
    return ARTISAN_SEARCH_RESULTS.filter((artisan) => {
      const matchesTerm =
        deferredTerm.length === 0 ||
        artisan.name.toLowerCase().includes(deferredTerm) ||
        artisan.category.toLowerCase().includes(deferredTerm) ||
        artisan.location.toLowerCase().includes(deferredTerm);
      const matchesCategory =
        !filters.category || artisan.category === filters.category;
      const matchesLocation =
        !filters.location ||
        artisan.location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesVerification =
        !filters.verifiedOnly || artisan.verified;
      const matchesMinPrice =
        filters.minPrice === undefined || artisan.price >= filters.minPrice;
      const matchesMaxPrice =
        filters.maxPrice === undefined || artisan.price <= filters.maxPrice;

      return (
        matchesTerm &&
        matchesCategory &&
        matchesLocation &&
        matchesVerification &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });
  }, [deferredTerm, filters]);

  const sortedArtisans = useMemo(
    () => sortArtisans(filteredArtisans, sortValue),
    [filteredArtisans, sortValue]
  );
  const totalPages = Math.max(1, Math.ceil(sortedArtisans.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedArtisans = sortedArtisans.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );
  const sidebarKey = JSON.stringify(filters);

  const handleSearchChange = (value: string) => {
    updateUrl({ q: value }, true);
  };

  const handleFilterChange = (nextFilters: SearchFilterValue) => {
    updateUrl(
      {
        category: nextFilters.category,
        location: nextFilters.location,
        maxPrice: nextFilters.maxPrice,
        minPrice: nextFilters.minPrice,
        verified: nextFilters.verifiedOnly,
      },
      true
    );
  };

  const handleSortChange = (nextSort: SearchSortValue) => {
    updateUrl({ sort: nextSort === DEFAULT_SORT ? undefined : nextSort }, true);
  };

  const handlePageChange = (page: number) => {
    updateUrl({ page });
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#020817] md:px-6 md:py-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748B]">
            Artisan Search
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A] md:text-4xl">
                Find the right artisan without the noise.
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Search by name, category, or location, then narrow the list with
                a few practical filters.
              </p>
            </div>
          </div>

          <SuggestionsDropdown
            className="relative mt-6 w-full"
            onSelect={handleSearchChange}
            query={term}
          >
            {({
              activeDescendantId,
              isExpanded,
              listboxId,
              onBlur,
              onFocus,
              onKeyDown,
            }) => (
              <>
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  aria-activedescendant={activeDescendantId}
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded={isExpanded}
                  autoComplete="off"
                  className="block h-11 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] pl-11 pr-4 text-sm text-[#020817] outline-none transition focus:border-[#CBD5E1] focus:ring-2 focus:ring-[#E2E8F0]"
                  onBlur={onBlur}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onFocus={onFocus}
                  onKeyDown={onKeyDown}
                  placeholder="Search by artisan name, category, or location"
                  role="combobox"
                  type="text"
                  value={term}
                />
              </>
            )}
          </SuggestionsDropdown>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterSidebar
          categories={ARTISAN_SEARCH_CATEGORIES}
          className="h-fit lg:sticky lg:top-6"
          initialValue={filters}
          key={sidebarKey}
          onChange={handleFilterChange}
          title="Refine results"
        />

          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {sortedArtisans.length} artisan
                    {sortedArtisans.length === 1 ? "" : "s"} found
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {term ? (
                      <>
                        Showing results for{" "}
                        <span className="font-medium text-[#334155]">{term}</span>
                      </>
                    ) : (
                      "Use search and filters to narrow the list."
                    )}
                  </p>
                </div>

                <SortControl
                  className="justify-between md:justify-start"
                  onSortChange={handleSortChange}
                  value={sortValue}
                />
              </div>
            </div>

            {pagedArtisans.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pagedArtisans.map((artisan) => (
                  <SearchResultCard artisan={artisan} key={artisan.id} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center">
                <h2 className="text-2xl font-semibold text-[#020817]">
                  No artisans match this search yet.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
                  Try broadening your search term, removing a filter, or
                  increasing your price range to see more results.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <PaginationControl
                currentPage={safeCurrentPage}
                onPageChange={handlePageChange}
                totalPages={totalPages}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ArtisanSearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <ArtisanSearchPageContent />
    </Suspense>
  );
}
