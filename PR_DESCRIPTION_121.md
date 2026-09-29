feat(frontend): add reusable support ticket form

Implements a shared support ticket submission component used in both the public `/contact` page and the artisan `/artisan/help` help centre.

## Changes

- **Support form component**: `src/components/support/ticket-form.tsx` — reusable controlled form with category and severity selects, description textarea, optional attachments, and submit feedback states (pending/success/error). It validates required fields (category and description), enforces attachment count/type/size limits, reuses file-size formatting from the existing document uploader, and surfaces accessible focus and aria-invalid states. Exports `TicketForm`, `TICKET_CATEGORY_OPTIONS`, `TICKET_SEVERITY_OPTIONS` and related types (`SupportTicketPayload`, `TicketCategory`, `TicketSeverity`, etc.) so pages can type their handlers.

- **Contact page integration**: `src/app/contact/page.tsx` — replaces the previous ad hoc name/email/subject/message form with the new `TicketForm` (dark variant). The page continues to simulate submission for now while keeping the same visual surface.

- **Help centre integration**: `src/app/(dashboard)/artisan/help/page.tsx` — adds a “Submit a Support Ticket” toggle that reveals an embedded `TicketForm` on the same light-surfaced page. This makes the component usable in the authenticated artisan context as well as on the public contact page.

- **Shared utilities**: `src/components/verification/document-uploader.tsx` — exports `formatFileSize` so the ticket form can reuse the existing file-size formatting logic.

## Notes

The form owns only client-side validation and feedback. It calls an `onSubmit` handler provided by the host page (currently simulated with `setTimeout`) so the same component can be wired to a real support API in future without changing its interface.

closes #121
