<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/atisyn-logo.png" />
    <source media="(prefers-color-scheme: light)" srcset="./public/Logo.png" />
    <img src="./public/Logo.png" width="180" alt="Artisyn.io logo" />
  </picture>
</p>

<h1 align="center">Artisyn.io</h1>

<p align="center">
  Find and connect with trusted local artisans through a community-powered Stellar ecosystem.
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" /></a>
  <a href="https://developers.stellar.org/"><img src="https://img.shields.io/badge/Stellar-ecosystem-7D00FF?style=flat-square&logo=stellar&logoColor=white" alt="Stellar ecosystem" /></a>
</p>

<p align="center">
  <a href="#project-ecosystem">Project Ecosystem</a> ·
  <a href="#frontend-route-map">Frontend Routes</a> ·
  <a href="#frontend-issue-labels">Issue Labels</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Project overview

Artisyn is a decentralised protocol built on Stellar that connects local artisans with users through community-curated listings. It gives skilled workers a place to be discovered, verified, and compensated while helping users find trusted services in their communities.

## Project ecosystem

- **[Frontend application](https://github.com/artisyn-io/artisyn.io)**
- [Backend API](https://github.com/artisyn-io/artisyn-api)
- [Smart contracts](https://github.com/artisyn-io/artisyn-contracts)
- [Figma design](https://www.figma.com/design/sJH5KPGVZ170uyFGx8qR0y/Artisyn---Find-Artisans-Near-You)
- [API documentation](https://artisyn.apidog.io)
- [Telegram channel](https://t.me/artisynGF)

## Frontend contributor guide

The frontend uses the Next.js App Router. Pages and API handlers live under `src/app`, shared interface components under `src/components`, feature-specific modules under `src/features`, and integrations or utilities under `src/lib`.

```text
src/
├── app/          # Pages, layouts, route groups, and API handlers
├── components/   # Shared UI and domain components
├── context/      # React context providers
├── features/     # Feature-specific frontend modules
├── icons/        # Shared icon components
└── lib/          # API helpers, Stellar integration, and utilities
```

## Frontend route map

The route groups in parentheses, such as `(auth)` and `(dashboard)`, organise the source tree but do not appear in the browser URL.

- **Available** means a page exists on the default branch. It does not imply that every backend integration or access guard is complete.
- **Planned** means the route is described by an open tracking issue but is not yet present on the default branch.
- **Development** means the route is intended for component testing or previewing rather than normal product navigation.

### Public routes

| URL | Source | Purpose | Status |
| --- | --- | --- | :---: |
| `/` | `src/app/page.tsx` | Landing and artisan discovery | Available |
| `/search` | `src/app/search/page.tsx` | Search and filter artisan profiles | Available |
| `/artisans/[id]` | `src/app/artisans/[id]/page.tsx` | Public artisan profile | Available |
| `/for-artisans` | `src/app/for-artisans/page.tsx` | Artisan-focused product introduction | Available |
| `/how-it-works` | `src/app/how-it-works/page.tsx` | Platform workflow for clients and artisans | Available |
| `/contact` | `src/app/contact/page.tsx` | Contact and support information | Available |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy | Available |
| `/terms` | `src/app/terms/page.tsx` | Terms and conditions | Available |

### Authentication and onboarding

| URL | Source | Purpose | Status |
| --- | --- | --- | :---: |
| `/connect-wallet` | `src/app/(auth)/connect-wallet/page.tsx` | Connect a Stellar wallet | Available |
| `/account-type` | `src/app/(auth)/account-type/page.tsx` | Choose an account role | Available |
| `/profile-setup` | `src/app/(auth)/profile-setup/page.tsx` | Complete an artisan profile | Available |
| `/client/account-completion` | `src/app/(onboarding)/client/account-completion/page.tsx` | Complete client onboarding | Available |

Profile setup is currently a single route. Work to split it into resumable steps is tracked in [#112](https://github.com/artisyn-io/artisyn.io/issues/112).

### Artisan dashboard

| URL | Source | Purpose | Status |
| --- | --- | --- | :---: |
| `/artisan/dashboard` | `src/app/(dashboard)/artisan/dashboard/page.tsx` | Artisan metrics and activity overview | Available |
| `/artisan/jobs` | `src/app/(dashboard)/artisan/jobs/page.tsx` | Browse available jobs | Available |
| `/artisan/jobs/[id]` | `src/app/(dashboard)/artisan/jobs/[id]/page.tsx` | View a single job | Available |
| `/artisan/listings` | `src/app/(dashboard)/artisan/listings/page.tsx` | Review available, applied, and completed jobs | Available |
| `/artisan/profile` | `src/app/(dashboard)/artisan/profile/page.tsx` | Manage the artisan profile | Available |
| `/artisan/settings` | `src/app/(dashboard)/artisan/settings/page.tsx` | Manage account preferences and privacy | Available |
| `/artisan/help` | `src/app/(dashboard)/artisan/help/page.tsx` | Access help and support resources | Available |

The artisan dashboard shares `src/app/(dashboard)/artisan/layout.tsx`. Authentication and role protection are tracked separately in [#119](https://github.com/artisyn-io/artisyn.io/issues/119) and [#120](https://github.com/artisyn-io/artisyn.io/issues/120).

### Planned client dashboard

| Planned URL | Target source | Tracking issue | Status |
| --- | --- | --- | :---: |
| `/client/dashboard` | `src/app/(dashboard)/client/dashboard/page.tsx` | [#108](https://github.com/artisyn-io/artisyn.io/issues/108) | Available |
| `/client/saved-artisans` | `src/app/(dashboard)/client/saved-artisans/page.tsx` | [#109](https://github.com/artisyn-io/artisyn.io/issues/109) | Planned |
| `/client/applications` | `src/app/(dashboard)/client/applications/page.tsx` | [#110](https://github.com/artisyn-io/artisyn.io/issues/110) | Planned |
| `/client/settings` | `src/app/(dashboard)/client/settings/page.tsx` | [#111](https://github.com/artisyn-io/artisyn.io/issues/111) | Planned |

### Planned admin dashboard

| Planned URL | Target source | Tracking issue | Status |
| --- | --- | --- | :---: |
| `/admin/curator-verifications` | `src/app/(dashboard)/admin/curator-verifications/page.tsx` | [#126](https://github.com/artisyn-io/artisyn.io/issues/126) | Planned |
| `/admin/reviews` | `src/app/(dashboard)/admin/reviews/page.tsx` | [#127](https://github.com/artisyn-io/artisyn.io/issues/127) | Available |
| `/admin/analytics` | `src/app/(dashboard)/admin/analytics/page.tsx` | [#128](https://github.com/artisyn-io/artisyn.io/issues/128) | Planned |

### Development routes

| URL | Source | Purpose | Status |
| --- | --- | --- | :---: |
| `/component-tests/application-timeline` | `src/app/component-tests/application-timeline/page.tsx` | Application timeline test page | Development |
| `/component-tests/document-uploader` | `src/app/component-tests/document-uploader/page.tsx` | Document uploader test page | Development |
| `/components-preview/search-controls` | `src/app/components-preview/search-controls/page.tsx` | Search controls preview | Development |

## Frontend issue labels

Frontend labels are designed to be combined. Start with the work type, add the relevant product area, and then use the phase label to understand the task's role in the delivery sequence. The complete set is available on the repository's [labels page](https://github.com/artisyn-io/artisyn.io/labels).

### Work type and stack

| Label | Use it for |
| --- | --- |
| `frontend` | Any user-facing frontend work |
| `nextjs` | Next.js-specific pages, routing, layouts, or framework work |
| `docs` | Documentation changes |
| `contributor-experience` | Work that improves contributor onboarding or workflows |

### Product area

| Labels | Area |
| --- | --- |
| `auth`, `onboarding`, `wallet` | Authentication, role selection, onboarding, and wallet connection |
| `dashboard`, `admin`, `client` | Role-specific dashboards and administration |
| `jobs`, `applications`, `profiles` | Jobs, applications, and artisan profile flows |
| `search`, `settings`, `support` | Search, account settings, and support experience |
| `payments`, `reviews`, `verification` | Payments, trust, reviews, and verification workflows |
| `design-system`, `responsive`, `ux` | Shared interface quality and user experience |

### Delivery phase

| Label | Typical scope |
| --- | --- |
| `phase:foundation` | Shared foundations, guards, clients, or architecture |
| `phase:core` | Core user-facing flows and pages |
| `phase:components` | Reusable UI components |
| `phase:integration` | API and data integration |
| `phase:ux` | Interaction, navigation, feedback, or responsive polish |
| `phase:content` | Product content and informational pages |
| `phase:ops` | Documentation and contributor operations |
| `phase:moderation`, `phase:analytics`, `phase:compliance` | Moderation, analytics, or compliance-specific work |

### Discovery and program labels

| Label | Meaning |
| --- | --- |
| `good first issue` | A scoped starting point for new contributors |
| `help wanted` | An issue where external contribution is welcome |
| `Stellar Wave` | An issue participating in the Stellar Wave program |
| `Non-rewarded` | An issue that does not carry a contribution reward |

For example:

- Authentication infrastructure may use `frontend`, `auth`, and `phase:foundation`.
- An admin analytics page may use `frontend`, `admin`, and `phase:analytics`.
- Contributor documentation may use `frontend`, `docs`, and `phase:ops`.

### Choosing an issue

1. Start with the [open frontend issues](https://github.com/artisyn-io/artisyn.io/issues?q=is%3Aissue%20state%3Aopen%20label%3Afrontend).
2. Select a product-area label that matches the part of the application you want to work on.
3. Use the `phase:*` label and the issue's `Depends on` section to understand sequencing.
4. Check assignees and recent discussion before beginning implementation.
5. Read the issue's acceptance criteria, branch name, and suggested PR title.
6. Confirm program and reward conditions on the issue itself; a label does not replace the assignment or completion rules of that program.

## Getting started

### Prerequisites

- A current [Node.js](https://nodejs.org/) LTS release
- [pnpm](https://pnpm.io/)

### Install and run locally

```bash
git clone https://github.com/artisyn-io/artisyn.io.git
cd artisyn.io
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page is implemented in `src/app/page.tsx`.

### Available scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm lint` | Run ESLint |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |

## Contributing

1. Choose an open issue and read its requirements, dependencies, and submission guidelines.
2. Create the branch requested by the issue, or use a short branch name that describes the task when none is provided.
3. Make the smallest complete change that satisfies the acceptance criteria.
4. Run the relevant verification commands, including `pnpm lint` and `pnpm build` for frontend changes when applicable.
5. Open a focused pull request with a summary, verification notes, and any known limitations.
6. Link the pull request to its issue with a closing keyword such as `Closes #123`.

Keep pull requests focused. If you discover an unrelated bug or missing route while working, open or reference a separate issue instead of expanding the current change without agreement.
