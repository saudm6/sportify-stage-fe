# Staff Bookings Implementation Plan

> **Execution update — 2026-09-16:** The owner authorized implementation, six sub-agents (three per repository), fresh branches from main and two GitHub PRs. The original checklists below remain the planning reference. Implementation and verification notes follow at the end.

**Goal:** Complete [frontend issue #5](https://github.com/saudm6/sportify-stage-fe/issues/5): a staff-only `/staff/bookings` page with server-filtered, paginated customer/external records and a read-only detail panel.

**Architecture:** Extend the existing booking report contract for list filters and add one detail GET endpoint. Keep the existing company/permission checks, Angular route guards, dashboard filter behavior and container/presentation pattern. Share only the report types, date helpers and HTTP service now needed by both staff features; no generic table, state framework or new dependencies.

**Tech stack:** Existing Angular 21, reactive forms, signals, Router, RxJS, HttpClient and Vitest; existing .NET, MediatR, FluentValidation and EF Core backend. Native form controls, HTML table and CSS.

## Constraints and decisions

- This is the complete read/list/detail slice. A report-only frontend is a useful interim milestone but does **not** close issue #5.
- No creating, cancelling, rescheduling, calendar, export, payment inference or unsupported action buttons.
- All search/filtering and counts happen on the server before pagination. Never filter the loaded page or fetch all pages into the browser.
- Keep feature code under `feature/staff/bookings`; reusable staff report pieces belong under `feature/staff/shared`. Preserve containers, components, service and models within that ownership.
- Default to the current Muscat calendar month, 20 rows per page; offer 20/50/100 page sizes. Dates are inclusive booking-start dates. Display OMR with three decimals.
- Keep the dashboard's Apply/Reset interaction: editing controls does not fetch; Apply, Reset and page-size changes reset page to 1. Back, Forward and refresh restore URL state.
- Use `bookingType + ':' + bookingPublicId` as identity. A customer and external booking may have the same public ID.
- Backend `AGENTS.md` requires the existing endpoint → query/handler → service flow and currently says not to add backend tests/testing infrastructure. Use the solution build and recorded manual API checks there. Use installed frontend tests here.
- No frontend `AGENTS.md` was present locally or at GitHub's default-branch contents endpoint. Follow the structure quoted in issue #5 and existing code; recheck instructions at execution time.

## Evidence checked on 2026-09-16

- Frontend checkout: `d82885b`; remote main: `0b40b6f9a6c41184e34f6d208f5f9d258da98c0c`. Backend checkout: `0410afc`; remote main: `e5ab555a56ca2052a1a811c3f1326b3e66742bc9`. GitHub comparisons showed no file differences between each checkout and its remote main. Start implementation from fresh main in an isolated branch/worktree, rather than adding work to the current issue-2 branch.
- Issue #1 is CLOSED. `staff.routes.ts` already gates ADMIN, FINANCE and SUPERVISOR. Existing auth infrastructure supplies bearer tokens and handles 401.
- Dashboard uses `queryParamMap`, reactive forms, signals, `switchMap`, retry and `takeUntilDestroyed`. It already implements Muscat date defaults and rejects malformed date ranges. Its disabled View bookings control is the integration point.
- `DashboardService.getReport` hardcodes page 1/size 20. Its `BookingReport` type omits the backend's existing `entries` and `pagination`; extend the type instead of inventing a second report response.
- Backend `BookingReportService.GetAsync` combines customer/external projections, filters by date/branch/sport, counts before paging and orders by booking start descending, source, public ID. Its summary counts CONFIRMED rows only; table totals must use `pagination.totalItems`.
- Report access already calls `RequireFeatureAsync(FeatureCodes.AnalyticsView)`, using current database access and company membership. Court-list access instead requires PricingManage: do not use `/staff/courts` to populate booking filters.
- Existing entities already contain end times, customer contact, external notes and cancellation timestamps. Customer bookings also have `CancelledByUserId`; external bookings do not. There is no persisted cancellation reason or separate human-readable booking reference. Use the booking public ID as Booking reference.
- Booking timestamps are mapped as `timestamp without time zone`. Preserve report semantics; do not append `Z` to existing data. The proposed detail contract uses the same Muscat wall-clock convention. Verify this with known records before release, including a browser outside Oman.
- `docs/staff-dashboard.md` contains historical statements about open issue #1 and missing server permission enforcement that are now stale. Treat current code as authoritative and update the affected documentation during this feature.

## Approach choice

1. **Recommended: extend report + one detail endpoint.** Reuses company-scoped queries, filters, pagination and authorization. The list still computes existing summary/breakdowns; accept that existing cost until measurements justify a separate list API.
2. Separate `/staff/bookings` list and detail APIs. Cleaner if list traffic later makes report aggregation costly, but requires a second list pipeline now.
3. Frontend-only report baseline. Fastest interim result, but lacks full search, filters and detail fields and cannot satisfy the issue.

## Proposed API contract

These additions do not exist yet. Implement and verify them in `sportify-stage-be` before enabling the complete UI.

### List: extend GET `/api/staff/booking-report`

Keep `from`, `to`, `branchPublicId`, `sportPublicId`, `page`, `pageSize`. Add optional:

| Query | Behavior |
|---|---|
| `courtPublicId` | Exact public-ID match within the caller's company |
| `status` | Trimmed exact status, maximum 20 characters; omitted/blank means all |
| `bookingType` | `INTERNAL` or `EXTERNAL`; omitted/blank means both |
| `search` | Trimmed, maximum 200 characters; case-insensitive literal substring of customer name or transaction reference; exact booking public-ID match when input parses as a GUID |

Apply all predicates to the combined company-scoped query before Count, summary/breakdowns and Skip/Take. Retain deterministic ordering and the existing repeatable-read snapshot. Preserve existing behavior when new parameters are omitted. Treat `%`, `_` and backslash literally in search; use the provider's translated string containment or explicitly escape a LIKE pattern. Do not concatenate SQL.

Keep page validation 1–1,000,000 and pageSize 1–100; reject empty GUIDs, unknown source values, oversized search/status and invalid/reversed dates with 400. A valid nonexistent/out-of-company filter yields an empty result, never another company's data. A page beyond the final page returns an empty entries array with accurate pagination; the UI offers Return to first page rather than pretending there are no matching records.

Extend `availableFilters` with:

```ts
courts: (NamedReference & { branchPublicId: string; sportPublicId: string })[];
statuses: string[];
```

Return company-owned courts, including inactive courts with historical bookings. Derive status choices from distinct statuses across that company's customer/external records, independent of the current search/page/date range. Branch/sport lists retain their existing semantics. The frontend may narrow court **options** using their branch/sport IDs; this is not filtering result rows locally. Clear a selected court when a branch/sport change makes it incompatible.

### Detail: add GET `/api/staff/bookings/{bookingType}/{publicId}`

Register this read-only route inside `StaffReportEndpoints.MapStaffReportEndpoints`; it is already registered by Program.cs. Add `GetBookingDetailsQuery`, its colocated validator/handler, and `IBookingReportService.GetDetailsAsync(string bookingType, Guid publicId, CancellationToken cancellationToken)`.

Use the same current-database AnalyticsView/company authorization as the list. Query the requested source only. Customer lookup must constrain order company, court branch company and transaction company exactly as the report does; external lookup constrains court branch company. Missing and out-of-company records both return 404; authenticated callers without access get 403. Do not trust client role/company claims or pass a company ID from the browser.

Return existing entry fields plus these additions (JSON camelCase):

```ts
export interface BookingDetails extends BookingReportEntry {
  bookingEnd: string;
  durationMinutes: number;
  customerContact: string | null;
  externalNotes: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
}
```

| Value | INTERNAL | EXTERNAL |
|---|---|---|
| End | `UserOrder.EndingTime` | `ExternalBooking.BookingEnd` |
| Duration | `(EndingTime - StartingTime).TotalMinutes` | `(BookingEnd - BookingStart).TotalMinutes` |
| Contact | `Transaction.Buyer.ContactNumber` | `CustomerContact` |
| External notes | null / not applicable | `Notes` |
| Cancellation time | `CancelledAt` | `CancelledAt` |
| Cancelled by | Existing related user's name, constrained to caller's company; otherwise null | null / unavailable |
| Recorded at | Existing report expression: transaction date, otherwise order created time | Created time |
| Transaction reference | Existing nullable transaction ID | null / not applicable |

Keep the existing entry projection semantics for all other fields. Calculate duration from endpoints for consistency across sources. No schema migration is expected. No invented cancellation reason, actor or payment state.

### Frontend types

Move existing report types into `src/app/feature/staff/shared/models/booking-report.ts` and extend with:

```ts
export type BookingType = 'INTERNAL' | 'EXTERNAL';
export interface BookingReportEntry {
  bookingPublicId: string;
  bookingType: BookingType;
  transactionReference: string | null;
  bookingStart: string;
  recordedAt: string;
  customerName: string;
  branch: NamedReference;
  court: NamedReference;
  sport: NamedReference;
  status: string;
  amount: number;
}
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
```

Add `entries: BookingReportEntry[]` and `pagination: Pagination` to `BookingReport`; extend availableFilters as above. Put `BookingDetails` and the bookings-only filter type in `bookings/models/bookings.ts`. The dashboard need not consume entries/details.

## File map

Frontend paths are relative to `E:/sportify/28_8_2026/sportify-stage-fe`; backend paths are relative to `E:/sportify/28_8_2026/sportify-stage-be`.

| Action | Path | Responsibility |
|---|---|---|
| Move + extend | `src/app/feature/staff/dashboard/models/booking-report.ts` → `src/app/feature/staff/shared/models/booking-report.ts` | Existing report plus row/pagination types |
| Move | `src/app/feature/staff/dashboard/models/dashboard-filters.ts` → `src/app/feature/staff/shared/models/report-filters.ts` | Existing date range and shared four-filter validation; rename DashboardFilters to ReportFilters |
| Move + extend | `src/app/feature/staff/dashboard/service/dashboard.service.ts` → `src/app/feature/staff/shared/service/booking-report.service.ts` | Rename to BookingReportService; optional list filters/page arguments, defaults unchanged |
| Create | `src/app/feature/staff/bookings/models/bookings.ts` | Bookings filters and detail response |
| Create | `src/app/feature/staff/bookings/service/bookings.service.ts` | Thin detail GET wrapper |
| Create | `src/app/feature/staff/bookings/containers/bookings.ts` | URL/form, list/detail requests and states |
| Create | `src/app/feature/staff/bookings/containers/bookings.spec.ts` | Focused integration checks with router and HTTP backend |
| Create | `src/app/feature/staff/bookings/components/bookings-page.ts`, `.html`, `.css` | Filters, table, pagination and inline detail panel |
| Modify | `src/app/feature/staff/staff.routes.ts`, `src/app/core/urls.ts`, `src/app/layouts/staff/staff-layout.html` | Guarded lazy page and navigation |
| Modify | `src/app/feature/staff/dashboard/containers/dashboard.ts`, `dashboard.spec.ts` | Updated shared imports; complete report fixture; link regression check |
| Modify | `src/app/feature/staff/dashboard/components/dashboard-page.ts`, `.html`, `.css` | Shared imports and active View bookings link |
| Modify | `docs/staff-dashboard.md` | Correct obsolete dependency notes and document active link |
| Modify, backend | `Test.Application/Endpoint/StaffReportEndpoints.cs` | Additional list query parameters and detail route |
| Modify, backend | `Test.Application/UserCases/StaffReports/Queries/GetBookingReport/GetBookingReportQuery.cs`, `GetBookingReportQueryHandler.cs` | Parameters/validation and service forwarding |
| Modify, backend | `Test.Application/Service/IBookingReportService.cs`, `BookingReportService.cs` | SQL filtering, options and authorized detail lookup |
| Modify, backend | `Test.Application/Dto/BookingSystem/StaffReports/BookingReportFiltersResponse.cs` | Court/status options; court option record can live beside this DTO |
| Create, backend | `Test.Application/Dto/BookingSystem/StaffReports/BookingDetailsResponse.cs` | Explicit detail DTO |
| Create, backend | `Test.Application/UserCases/StaffReports/Queries/GetBookingDetails/GetBookingDetailsQuery.cs`, `GetBookingDetailsQueryHandler.cs` | Detail query, validator and delegating handler |

No dedicated route file for a single leaf route, no generic detail service, no separate modal infrastructure, no compatibility re-export files. Update every import/caller when moving shared files.

## Task 1: Implement and verify the backend dependency

**Consumes:** Existing report query/projections, entities and AccessService. **Produces:** The extended list and detail contracts above.

- [ ] Re-read backend instructions and check all callers with `rg -n 'GetBookingReportQuery|IBookingReportService|BookingReportFiltersResponse' Test.Application Test.Web`.
- [ ] Extend the existing endpoint/query/handler/service signatures with the four optional filters; preserve defaults for old callers. Add validation next to the existing query validator.
- [ ] Apply predicates before all counts/pagination and return court/status options under AnalyticsView access. Keep the existing deterministic order and snapshot transaction.
- [ ] Add the detail DTO/query/handler and route. Load only the source-specific, company-scoped record; throw the existing `EntityNotFoundException` when absent. Use the existing service registration, without adding another service abstraction.
- [ ] Run `dotnet build test.slnx` from the backend root. Expected: successful build.
- [ ] Against a local seeded database, verify both sources, matching customer name/transaction/public-ID search, literal `%`/`_`, court/status/source combinations, page boundaries, pageSize 1/100/101, invalid dates/GUIDs/source and a missing detail record. Verify search results on a later page affect the full count.
- [ ] Verify anonymous 401; USER/no-feature/no-company 403; cross-company detail 404; cross-company filter empty; and permission revoked in the database while retaining an old token cannot fetch either endpoint. Confirm list options reveal no other company's courts/statuses.
- [ ] Compare an old dashboard request before/after: summary, breakdowns, entries and pagination remain identical when new filters are omitted. Record the API results in the implementation PR; do not add backend test infrastructure.

## Task 2: Build the URL-driven bookings list

**Consumes:** Extended report response. **Produces:** `/staff/bookings` with server filtering/pagination and explicit request states.

- [ ] Move the three reusable dashboard files as listed above and update all imports. Keep existing date validation; additionally reject the all-zero GUID in shared optional-ID validation to match the backend. Rerun dashboard tests after the move.
- [ ] Extend `BookingReportService.getReport` to accept `ReportFilters` plus optional `{ courtPublicId, status, bookingType, search, page, pageSize }`. Defaults stay page 1/size 20. Omit blank optional parameters. Dashboard calls remain `getReport(filters)`.
- [ ] Create the bookings container and presentation component. Use a typed reactive form with from/to/branch/sport/court/status/source/search; validation stays in TypeScript, matching the dashboard convention. Keep draft and applied filters separate.
- [ ] Make URL query parameters the applied source of truth. Missing dates/page/pageSize get concrete month/1/20 defaults via `replaceUrl`; malformed supplied values show validation without fetching. Enforce integer/range limits for pagination, GUID/source rules and string lengths. Keep `bookingType` as the source query name end-to-end.
- [ ] Use the dashboard's route → retry → `switchMap` request pattern. Catch errors inside each request so Retry and later navigation still work. Destroy the subscription with `takeUntilDestroyed`. Clear old rows/counts while loading or failed; retain valid option lists to allow changing filters.
- [ ] Apply writes all form values plus page 1; identical Apply triggers Retry. Reset restores month/all filters/empty search/page 1. Page changes preserve applied filters; page-size changes reset page 1. Do not use unsubmitted form values for pagination.
- [ ] Render booking start, customer, court/branch, sport, source, status and amount with a real table and column headings. Track rows with `row.bookingType + ':' + row.bookingPublicId`. Add an explicit View details button per row. Labels are Internal and External; status is text as well as color. Blank names display Not recorded.
- [ ] Use `pagination.totalItems`, `page`, `pageSize` and `totalPages` for count and controls. Never use `summary.totalBookings`. Zero records shows No bookings match these filters. Out-of-range pages show a Return to first page action. Disable impossible Prev/Next navigation.
- [ ] Provide loading status, local/server validation, forbidden state and Retry for network/5xx errors. Leave 401 handling to the existing interceptor. Do not turn failures into empty results.
- [ ] Add `PAGE_PATHS.bookings`, a lazy `loadComponent` child inside staffRoutes and a staff navigation RouterLink with `routerLinkActive`/`ariaCurrentWhenActive`. Inherit the existing staff guards.

## Task 3: Add details and dashboard navigation

**Consumes:** Selected row identity, detail GET response, dashboard applied filters. **Produces:** Read-only detail panel and reliable dashboard-to-list navigation.

- [ ] Add `BookingsService.getDetails(bookingType: BookingType, publicId: string)` returning `HttpClient.get<BookingDetails>` for the new route. No mutation methods.
- [ ] Keep selected identity in container state, independent of list filters; use a separate `switchMap` stream for detail requests and Retry. Opening a different row, closing the panel, changing list state or leaving the page cancels the previous detail request and clears stale detail data.
- [ ] Put a non-modal, labelled `<section>` beside the table on desktop and below it on narrow screens. This satisfies the panel requirement without adding dialog/focus-trap infrastructure. Focus its heading (`tabindex="-1"`) on open; Close/Escape returns focus to the originating button if still present, otherwise the list heading. Keyboard users can tab normally through the page.
- [ ] Render start/end, duration, recorded date, booking reference, transaction reference, customer contact, external notes and cancellation information. Do not silently replace Recorded at with booking start or infer payment status from transaction presence.
- [ ] Apply precise null labels: customer missing transaction/contact = Not recorded; external transaction and customer external-notes = Not applicable; missing external notes/contact = Not recorded; non-cancelled cancellation fields = Not applicable; cancelled record with missing metadata = Not recorded. External cancelled-by = Unavailable for external bookings. No cancellation reason field because none is stored.
- [ ] Show independent detail Loading, 404 Booking no longer available, 403 Access denied and retryable network/server errors. The list remains usable when detail loading fails.
- [ ] Replace the dashboard's disabled control with a RouterLink to `/staff/bookings`, passing **applied** from/to/branch/sport and `status: 'CONFIRMED', page: 1, pageSize: 20`. Confirmed status makes the destination match the dashboard's displayed scope/count. Staff navigation itself defaults to all statuses. Unsaved dashboard drafts must not affect the link.
- [ ] Update obsolete dashboard documentation and replace button-specific link styling as needed; preserve the existing page's look.

## Task 4: Verify the issue end-to-end

**Produces:** Passing focused regression checks and recorded manual acceptance evidence.

- [ ] Add focused router/HTTP tests in the one bookings spec, reusing the dashboard's TestBed setup: `provideRouter`, then `provideHttpClient`, then `provideHttpClientTesting`. Use `RouterTestingHarness` and `HttpTestingController`; no new test framework.
- [ ] Include this key regression: two entries with the same public ID but different sources both render and open distinct detail URLs; `pagination.totalItems = 41` while `summary.totalBookings = 3`, and the page displays 41 as the list total.
- [ ] Check applying search/status/source/court from page 2 sends one filtered request for page 1; paging carries applied filters; size changes reset page; drafts do not fetch; refresh/back restore parameters; malformed parameters make no request.
- [ ] Check changing filters cancels the old list request (`expect(stale.cancelled).toBe(true)`); opening another row/closing cancels the old detail request; error followed by Retry succeeds. Verify loading, zero results, out-of-range page, 400, 403 and detail 404 do not display stale records.
- [ ] Check customer/external null labels and absent transaction never render Unpaid. Check the dashboard link uses applied filters and CONFIRMED even after draft form edits. Keep these related cases in the existing dashboard spec and new bookings spec, not a suite per helper.
- [ ] Run from the frontend root:

```powershell
npm test -- --watch=false --include='src/app/feature/staff/**/*.spec.ts' --include='src/app/core/role.guard.spec.ts'
npm run build
```

Expected: focused tests and production build pass. Run the full suite once (`npm test -- --watch=false`); compare failures with a fresh pre-change baseline rather than relying on old dashboard notes or repairing unrelated legacy tests.

- [ ] Browser-check at 1440px and 390px: readable table with contained horizontal scrolling, wrapping long references/notes, labelled controls, visible focus, keyboard detail open/close and filter validation. No body overflow or browser exceptions.
- [ ] Verify booking-start date boundaries and displayed start/end/recorded/cancellation values against known backend records in both Muscat and a non-Oman browser timezone. For offset-free timestamps preserve the documented wall-clock value; for explicit offsets format in Asia/Muscat. Do not let the browser timezone shift booking dates.
- [ ] Verify the complete frontend against the running backend with both booking sources and company/permission cases; mocked frontend checks alone do not establish API acceptance. Commit reviewed backend and frontend changes separately, and deploy the backend contract before the complete frontend.

## Acceptance coverage

| Issue requirement | Covered by |
|---|---|
| Both sources, distinct labels/identity | Composite row key, source labels, source-specific detail URL; tasks 2–4 |
| Full-result totals, filters/search, page reset | Server predicates before Count/Skip/Take and URL state; tasks 1–2, 4 |
| Matching dashboard filters | Applied dates/IDs plus CONFIRMED drill-through; tasks 3–4 |
| Unavailable versus not applicable, no unpaid inference | Explicit field mapping/null labels; tasks 1, 3–4 |
| Staff access, no unsupported mutation | Current database feature/company checks and read-only UI; tasks 1–4 |
| Loading/empty/validation/missing/retry | Independent list/detail states and regression checks; tasks 2–4 |

## Context7 references

Queried official Angular documentation through Context7 (`/websites/angular_dev`) for the existing Angular 21 stack; use these established APIs without upgrading packages.

- [Read route state](https://angular.dev/guide/routing/read-route-state): reactive route parameters are appropriate for filters and pagination. Reuse the existing `queryParamMap` pattern.
- [Making HTTP requests](https://angular.dev/guide/http/making-requests): unsubscribing aborts in-flight HttpClient requests, so `switchMap` prevents stale list/detail responses from winning.
- [HTTP testing](https://angular.dev/guide/http/testing) and [routing testing](https://angular.dev/guide/routing/testing): use the installed HTTP backend and RouterTestingHarness for behavior checks.

No new packages, broad refactors or speculative management APIs are needed. Reconsider a dedicated list API only if measured report aggregation cost becomes material.

## Implementation notes

- Both repositories use `feat/issue-5-staff-bookings`, based on the main revisions recorded above. Six sub-agents handled backend list, backend detail, backend verification, frontend state, frontend presentation and frontend regression/review.
- Follow-up correction (2026-09-17): list and detail logic live in one `BookingReportService.cs`; the partial split was removed. Backend Flyway V10 renames only `user_orders` to `bookings`, retaining separate `external_bookings`. API source values are INTERNAL/EXTERNAL and statuses are PENDING/CONFIRMED/CANCELLED.
- The new page keeps the dashboard palette/type, with native filters, a readable table, source/status labels and a non-modal detail panel. It displays offset-free timestamps as Oman wall-clock values and explicit-offset timestamps in Asia/Muscat.
- Backend build and 77 real HTTP checks passed against a new disposable PostgreSQL database. No backend testing infrastructure or dependencies were added.
- Frontend regression tests cover the real router and mocked HTTP backend; browser verification additionally uses the running backend and seeded records. Full-suite baseline contains seven existing failures, tracked separately from the new feature.

### Final verification

- Focused staff/guard suite: 18 tests passing. Full frontend suite: 117 passing and the same seven legacy failures as the 110-pass baseline. No new failures.
- Frontend production build and backend solution build pass. Existing authentication stylesheet budgets and backend package warnings remain.
- Mocked browser checks at 1440px/390px pass: both booking sources, composite identity, details, focus/Escape restoration, draft/apply/refresh, error/retry, no body overflow or browser exceptions. Oman time was checked in a New York browser timezone.
- Browser checks against the live disposable API pass: both sources/details, server totals/search, refresh, matching CONFIRMED dashboard navigation and mobile layout. Seventy-seven separate backend HTTP checks verify data and access rules.
- Review corrected filter accessible names, a wrapping pagination label and an off-screen table header that caused body overflow. No new packages or booking mutations were introduced. Follow-up Flyway V10 renames the internal table only; release it with the matching backend.
