# Staff dashboard (issue #4)

Route: `/staff/dashboard`. Started from `origin/main` at `534cb44`.

The dashboard uses independent booking-report and booking-filters endpoints and Angular stack with no new dependencies. The container owns requests and applied filters; the page component owns presentation. Staff navigation lives in `layouts/staff`.

`app.routes.ts` loads section routes. `staff.routes.ts` owns staff access and layout, then loads `dashboard.routes.ts`. Existing user/auth URLs are assembled in `user.routes.ts`. The obsolete shopping features (product, order and order-line-item) live under `feature/legacy`, with their URLs preserved through `legacy.routes.ts`.

`core/role.guard.ts` reads each route's `data.allowedRoles`. It requires at least one matching role for every configured ancestor/child policy and denies access if no policy is configured. Staff declares `['ADMIN', 'FINANCE', 'SUPERVISOR']`. Login landing-page selection remains separate.

## Display and filters

- OMR and Asia/Muscat were confirmed by the project owner on 2026-09-08. Amounts display three decimal places. Date presets use Muscat calendar days, with Monday–Sunday weeks.
- Default is the full current month. Concrete applied dates and branch/sport public IDs are saved in URL query parameters; drafts do not change results until Apply. Reset applies the current month and clears branch/sport selections.
- One metrics-only report response supplies summary and both breakdowns. Paginated entries are never used to calculate metrics. Each bar shows its share of selected confirmed revenue, with exact amounts, counts and averages in text.
- Required dates, supported date limits, range ordering and IDs are validated in TypeScript reactive forms, with the same validation for incoming URL filters. Templates retain accessibility metadata but no validation attributes. Each URL change or Retry cancels the previous request. Failed requests hide metrics and offer Retry; successful empty reports display API-provided zero values.
- Filter options load once per page instance from `/api/staff/booking-filters`, independently of metrics/list data. Date, filter and page changes preserve options. Options have their own loading/error/Retry filter options control; options failure does not hide successful data, and data failure does not discard options. An explicit retry replaces options only on success. There is no global cache. Source choices come from `bookingTypes`; all supported PENDING/CONFIRMED/CANCELLED statuses remain selectable.
- Design uses court blue `#22578b`, pale blue `#e6eff7`, slate `#24374b`, white `#ffffff`, and cool background `#f4f7fa`. Trebuchet MS carries headings and body text; tabular numerals keep monetary values readable. Native form controls and CSS bars avoid a chart or styling dependency.

## Release dependencies

Issue #1 is closed. Missing, malformed or expired sessions and accounts without an allowed staff role cannot enter staff routes. This is navigation control, not server authorization.

The backend report service enforces current database `FEAT_ANALYTICS_VIEW` permission and company membership. The Bookings detail endpoint uses the same policy; a staff route role alone does not grant data access.

View bookings opens `/staff/bookings` with the container's applied dates/branch/sport, `status=CONFIRMED`, page 1 and page size 20. Unsaved filter drafts do not change the link. The status restriction matches the dashboard metrics; the staff navigation link opens all booking statuses. Shared date helpers and response types live under `feature/staff/shared`. Dashboard uses `/api/staff/booking-report`; BookingsService uses `/api/staff/bookings` for the list and its existing detail route. Report responses contain only `from`, `to`, `summary`, `byBranch`, `bySport`; list responses contain only `from`, `to`, `entries`, `pagination`. Neither embeds options. Options contain `branches`, `sports`, `courts`, `statuses`, `bookingTypes`. These are coordinated breaking changes to the unreleased API contract.

Deploy the matching backend with Flyway V10/V11: V10 renames internal `user_orders`; V11 merges external records into `bookings`, referencing `booking_type.name` via `booking_type_name`. Types remain INTERNAL/EXTERNAL, statuses PENDING/CONFIRMED/CANCELLED. External transaction references remain NULL; contact/notes and original public references remain intact. Court sport is fixed at creation; deactivation preserves history. There is no staff court editor in this frontend.

Take and verify a fresh backup, stop old writers, recheck conflicts/dependencies, run migrations, deploy both apps, and smoke-test before resuming writes. Retire legacy Java writers/readers and exclude old seed scripts targeting `user_orders`/`external_bookings`. Failed V11 rolls back; after successful cutover, backup restore is safe only before new writes, otherwise reconcile writes or use a reviewed forward repair. PR development migrated disposable databases only. Backend PR #11 and frontend PR #20 must release together.

## Verification

```sh
npm test -- --watch=false --include='src/app/feature/staff/**/*.spec.ts' --include='src/app/core/role.guard.spec.ts'
npm run build
```

All 20 focused tests pass: split response contracts, one options request per page, independent retries and retained options, API-driven source choices, PENDING options, filter/URL validation, stale-request cancellation, destruction cancellation, external null transaction/contact/notes, Oman dates, defaults, dashboard CONFIRMED drill-through and role enforcement. Production build succeeds with only existing login/register stylesheet budget warnings.

Updated mock and real disposable API browser checks pass at desktop 1440px/mobile 390px: list/source filters/details, focus/Escape, drafts/apply/refresh, no overflow/errors, independent options/metrics retries and dashboard drill-through. Timestamps were checked under a New York browser timezone. Backend checks include full-schema migration rehearsals, 163 HTTP checks and single-statement read consistency under concurrent writes.

Compared with `f1ff032`, changed frontend production files total 982 -> 1,066 lines (+84) for independent options state. Backend runtime C# drops 121 lines; the safe migration adds 146. Combined changed production files including migration total 2,094 -> 2,203 (+109); this is query/work reduction, not a claim of total code reduction. Each metrics/list response now has one booking data SELECT; options use four reference SELECTs once per page instance. Authorization queries are separate. Frontend filter/date/page changes request only metrics or list data.

The issue-5 full-suite baseline on 2026-09-16 had 7 unrelated failing tests and 110 passing tests (legacy missing fixture inputs/providers and a stale starter title assertion). They were not changed as part of this work.
