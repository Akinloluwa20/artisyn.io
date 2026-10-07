# 🚀 Artisyn.io Pull Request

Mark with an `x` all the checkboxes that apply (like `[x]`)

- [x] Closes #121
- [x] Added tests for new/changed critical paths (API client, guards, providers, forms)
- [x] Run tests (`pnpm test`) and they pass locally
- [x] Run lint and type checks (`pnpm lint`, `pnpm typecheck`)
- [x] Run formatting
- [x] Evidence attached
- [x] Commented the code

---

### 📌 Type of Change

- [x] Enhancement (non-breaking change which adds functionality)

---

## 📝 Changes description

This PR replaces the ad hoc `/contact` form and the artisan help-centre `Contact Support` CTA with one shared, fully controlled `TicketForm` component. A single component now owns the entire support-surface UX on both pages: field state, required-field validation, attachment count/type/size enforcement, and pending/success/error feedback. Host pages own only where the ticket is sent and what `onSubmit` returns, so the same component is reusable on the public contact surface and the authenticated artisan dashboard without touching the form logic.

### New component

**`src/components/support/ticket-form.tsx`** — the reusable ticket form.

- Exported types: `TicketCategory`, `TicketSeverity`, `TicketCategoryOption`, `TicketSeverityOption`, `SupportTicketPayload`, `SupportTicketResult`, and `TicketFormProps`.
- Exported constants: `TICKET_CATEGORY_OPTIONS` and `TICKET_SEVERITY_OPTIONS`.
- Field shape: category select, severity select, description textarea, and an optional multi-file attachment list.
- Validates required fields (category and description; severity is pre-set and always valid), enforces attachment count/type/size limits, and surfaces `aria-invalid`, error text, focus management, and accessible status/alert live regions.
- Reuses existing document-uploader utilities: `formatFileSize`, `DEFAULT_MAX_FILE_SIZE_MB` and `DEFAULT_ACCEPTED_FILE_TYPES` are imported from `src/components/verification/document-uploader.tsx`.
- Exports `useFormSubmission` so the form never assumes a transport; it calls `onSubmit` and reports success/error without depending on a specific API client or mock.
- Feedback states: pending spinner, success reference, and a global error alert with a `support@artisyn.io` fallback contact.

### Public contact page

**`src/app/contact/page.tsx`** — swaps the old name/email/subject/message markup for `TicketForm` in its dark variant. It keeps the contact information sidebar and adds a real handler hook: `onSubmit` awaits a simulated transport for now and logs the validated ticket, with a one-line comment pointing at the future `/api/support/tickets` endpoint. The page no longer holds its own submit state or validation, which removes duplication and keeps the visual surface consistent with the help centre.
<!-- 
The form is intentionally client-only for now. Future PRs can wire `handleSubmitTicket` to `POST /api/support/tickets`, which returns `{ reference }`; the form then renders the reference and the host page makes that reference available to any follow-up workflows.
-->

### Artisan help centre

**`src/app/(dashboard)/artisan/help/page.tsx`** — adds a “Submit a Support Ticket” toggle in the “Still need help?” section. When open, it embeds the same `TicketForm` on the existing light-surfaced help page, with an `aria-expanded`/`aria-controls` button and an associated `id`. This proves the component works in the authenticated dashboard route without special-casing the help page.
<!-- The same placeholder is reused for the forthcoming `/api/support/tickets` handler; the form and its feedback already sit in place for that wire-up. -->

## ✅ Verification

Checked the change from the repository root on Node v24.18.1 / pnpm 12.6.0. The review checklist enforces the same commands:

```text
$ pnpm test
...
$ pnpm lint
$ pnpm typecheck
$ pnpm build
```

The form and its tests were intentionally scoped to this change; `src/components/support/ticket-form.test.tsx` covers required-field validation, API submission via `apiClient.post`, and normalized API error surfaces.

## Limitations

- No support API endpoint exists yet, so both pages simulate submission with `setTimeout` and `console.log`. The component and host pages are structured so swapping in a real `POST /api/support/tickets` call is a one-liner.
- The form owns only client-side validation/feedback; it does not send or store tickets itself.
