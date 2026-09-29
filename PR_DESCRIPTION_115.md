## Summary

Adds shared skeleton loading components and replaces the ad-hoc loading placeholders across the dashboard, jobs, search and profile routes with them.

Closes #115

## What changed

### New components

`src/components/ui/skeleton-card.tsx`

- `Skeleton` — the base pulsing block (`animate-pulse rounded bg-gray-200`, `aria-hidden`). This is the single source of truth for placeholder block colour and pulse, so the rest of the app stops re-declaring `bg-gray-200` + `animate-pulse` in a dozen places.
- `SkeletonCard` — a placeholder matching the app's card chrome (`rounded-lg border border-gray-200 bg-white p-4 shadow-sm`). Props: `showMedia` (leading thumbnail/icon tile), `lines` (text lines under the title), `showAside` (trailing badge/amount block), `label` (accessible name), `className`.

`src/components/ui/skeleton-list.tsx`

- `SkeletonList` — a stack of `count` placeholder rows. Props: `count`, `renderItem` (custom row renderer), `label`, `className`.
- `SkeletonListItem` — the default row (leading media block, two-line text column, trailing block), also exported for standalone use.

### Adoption — 13 files across 12 routes

### Replaced ad hoc placeholders

| Route | File | Previous placeholder |
| --- | --- | --- |
| `/artisan/dashboard`, `/artisan/earnings`, `/client/*`, `/admin/*` | `src/app/(dashboard)/loading.tsx` | Hand-rolled sidebar / header / stat-card / row skeletons |
| `/artisan/dashboard` | `src/app/(dashboard)/artisan/dashboard/page.tsx` | `MetricsSkeleton`, `ProfilePerformanceSkeleton`, and a `Loader2` spinner for the Active Jobs list |
| `/artisan/earnings` | `src/app/(dashboard)/artisan/earnings/page.tsx` | `SummaryCardsSkeleton`, `TransactionRowSkeleton`, and a second redundant `Loader2` spinner |
| `/artisan/listings`, `/artisan/jobs` | `.../listings/(components)/TabPages.tsx` | `<p>Loading jobs...</p>` Suspense fallback |
| `/artisan/listings`, `/artisan/jobs` | `.../listings/(components)/JobCard.tsx` | `<p>Loading available jobs...</p>` |
| `/artisan/listings` | `.../listings/(components)/AppliedJobsList.tsx` | `<div>Loading applications...</div>` |
| `/artisan/listings` | `.../listings/(components)/CompletedJobsList.tsx` | `<div>Loading completed jobs...</div>` |
| `/client/applications` | `src/app/(dashboard)/client/applications/page.tsx` | `<p>Loading applications…</p>` |
| `/client/dashboard` | `src/app/(dashboard)/client/dashboard/page.tsx` | `animate-pulse` block |
| `/search` | `src/app/search/page.tsx` | `SearchPageFallback` — a single "Loading artisan search..." line |
| `/artisan/profile` | `src/components/profile/profile-completion-widget.tsx` | `animate-pulse` bar stack |

### New route loading states

`/artisan/jobs` and `/artisans/[id]` had no `loading.tsx` at all, so navigating to them showed nothing while the server component resolved. Both are added, composed entirely from the shared components:

- `src/app/(dashboard)/artisan/jobs/loading.tsx` — heading, tab strip, job rows.
- `src/app/artisans/[id]/loading.tsx` — profile hero, details card, portfolio grid, review list.

## Design decisions and judgement calls

**`Skeleton` lives in `skeleton-card.tsx`.** The issue names two files, so rather than adding a third, the base primitive is exported from `skeleton-card.tsx` and `skeleton-list.tsx` imports it. This keeps one source of truth for the block colour and pulse while staying within the two files the issue specifies.

**Pulse moved from the container to the blocks.** The old markup put `animate-pulse` on a wrapper and painted plain grey divs inside, which means the pulse was invisible for any child that had its own opaque background. `Skeleton` owns the animation and the containers are plain layout, so every block visibly pulses and containers composed by a caller never double-pulse.

**`renderItem` instead of a growing set of list variants.** The earnings transaction rows (right-aligned amount), the dashboard Active Jobs rows (borderless, `divide-y`) and the job cards do not share one row shape. Rather than adding `variant="transaction" | "job" | …` to the API, `renderItem` lets each page draw the row it already had, composed from `Skeleton`. The default row covers the common case with zero configuration, so simple callers never touch it.

**A redundant spinner was removed from the earnings page.** The page rendered `TransactionRowSkeleton` *and* a `Loader2` spinner under the same `txLoading` condition, so both appeared together and the list grew a spinner block beneath itself mid-load. The skeleton supersedes it, so the spinner is gone. Flagging it because it is a behaviour change, not a pure refactor.

**Live-region semantics.** `SkeletonCard` and `SkeletonList` carry `role="status"`, `aria-busy="true"` and a `label` so the pending region is announced, and each block is `aria-hidden` so the placeholder bars are never read out as content. This follows the convention already used in `src/components/reviews/review-list.tsx` and `src/components/payments/tip-history-list.tsx`. The route-level `loading.tsx` files deliberately do *not* add their own `role="status"` on the outer wrapper, so the page announces once via the shared components rather than once per nested region.

**The `(auth)/loading.tsx` skeleton was left alone.** It is a bespoke two-panel split layout for the wallet/onboarding routes and has no list or card structure to share; converting it would mean overriding nearly every class it sets, which defeats the point of the shared component. Worth a follow-up issue rather than a hollow adoption.

**`review-list.tsx` and `tip-history-list.tsx` were left alone.** Their skeletons are domain-shaped (`ReviewCardSkeleton`, `TipCardSkeleton`) and their loading wrappers already follow the `aria-busy`/`aria-live` convention. They are not the "ad hoc placeholders on key pages" the issue targets.

## Acceptance criteria

- [x] **Skeleton components are reusable.** Three exports covering the block, the card and the list, all with no fetching logic and no knowledge of any page. They take `className` merged through the repo's `cn()`, and `renderItem` for shapes the default row does not cover. Used on 12 routes, including two brand-new `loading.tsx` files.
- [x] **Replaces ad hoc loading placeholders on key pages.** All four routes named in the issue:
  - **dashboard** — `(dashboard)/loading.tsx`, `artisan/dashboard/page.tsx`, `client/dashboard/page.tsx`
  - **jobs** — `artisan/jobs/loading.tsx` (new), `listings/(components)/TabPages.tsx`, `JobCard.tsx`, `AppliedJobsList.tsx`, `CompletedJobsList.tsx`
  - **search** — `SearchPageFallback` in `app/search/page.tsx`
  - **profile** — `src/components/profile/profile-completion-widget.tsx` on the artisan profile route, plus a new `artisans/[id]/loading.tsx` for the public profile route

  Every pre-existing hand-rolled placeholder on those routes was replaced; the `(dashboard)/loading.tsx` rewrite and the earnings/dashboard table rewrites remove the bulk of the duplicated `bg-gray-200` + `animate-pulse` markup.

## Verification

Repo commands, taken from `package.json` (`dev`, `build`, `start`, `lint`). There is no `test` or `typecheck` script, so `npx tsc --noEmit` was run directly for the type check.

Run from the repository root on Node v24.18.1 / pnpm 12.6.0.

```
$ pnpm lint
$ eslint
LINT EXIT: 0
```

```
$ npx tsc --noEmit
TSC EXIT: 0
```

```
$ pnpm build
...
├ ○ /artisan/jobs
├ ○ /client/applications
├ ○ /client/dashboard
├ ○ /search
└ ○ /terms


○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

BUILD EXIT: 0
```

Note for reviewers running the type check on a fresh clone: `next-env.d.ts` is gitignored and is only generated by `next build` / `next dev`. `npx tsc --noEmit` before either of those will report pre-existing `TS2307` errors for the `bg.png` imports; run `pnpm build` first.

All three commands were also confirmed green on `upstream/main` before this change, so the results above reflect this PR and not pre-existing breakage.

## Limitations

- No automated tests are added: the repository has no test runner and no `test` script, so there is nothing to hook into. Verification is lint, type check and build.
- The redundant earnings spinner removal is a behaviour change; see the note above.
- `(auth)/loading.tsx` and the domain-shaped review/tip skeletons still carry their own markup — see the two judgement calls above.

closes #115
