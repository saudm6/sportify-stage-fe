# Staff dashboard (issue #4)

Route: `/staff/dashboard`. Started from `origin/main` at `534cb44`.

The dashboard uses the existing booking-report endpoint and Angular stack with no new dependencies. The container owns requests and applied filters; the page component owns presentation. Staff navigation lives in `layouts/staff`.

`app.routes.ts` loads section routes. `staff.routes.ts` owns staff access and layout, then loads `dashboard.routes.ts`. Existing user/auth URLs are assembled in `user.routes.ts`. The obsolete shopping features (product, order and order-line-item) live under `feature/legacy`, with their URLs preserved through `legacy.routes.ts`.

`core/role.guard.ts` reads each route's `data.allowedRoles`. It requires at least one matching role for every configured ancestor/child policy and denies access if no policy is configured. Staff declares `['ADMIN', 'FINANCE', 'SUPERVISOR']`. Login landing-page selection remains separate.

## Display and filters

- OMR and Asia/Muscat were confirmed by the project owner on 2026-09-08. Amounts display three decimal places. Date presets use Muscat calendar days, with Monday–Sunday weeks.
- Default is the full current month. Concrete applied dates and branch/sport public IDs are saved in URL query parameters; drafts do not change results until Apply. Reset applies the current month and clears branch/sport selections.
- One report response supplies summary and both breakdowns. Paginated entries are never used to calculate metrics. Each bar shows its share of selected confirmed revenue, with exact amounts, counts and averages in text.
- Required dates, supported date limits, range ordering and IDs are validated in TypeScript reactive forms, with the same validation for incoming URL filters. Templates retain accessibility metadata but no validation attributes. Each URL change or Retry cancels the previous request. Failed requests hide metrics and offer Retry; successful empty reports display API-provided zero values.
- Design uses court blue `#22578b`, pale blue `#e6eff7`, slate `#24374b`, white `#ffffff`, and cool background `#f4f7fa`. Trebuchet MS carries headings and body text; tabular numerals keep monetary values readable. Native form controls and CSS bars avoid a chart or styling dependency.

## Release dependencies

Issue #1 is closed. Missing, malformed or expired sessions and accounts without an allowed staff role cannot enter staff routes. This is navigation control, not server authorization.

The backend report service enforces current database `FEAT_ANALYTICS_VIEW` permission and company membership. The Bookings detail endpoint uses the same policy; a staff route role alone does not grant data access.

View bookings opens `/staff/bookings` with the container's applied dates/branch/sport, `status=CONFIRMED`, page 1 and page size 20. Unsaved filter drafts do not change the link. The status restriction matches the dashboard metrics; the staff navigation link opens all booking statuses. Shared date helpers and response types live under `feature/staff/shared`. Dashboard uses `/api/staff/booking-report`; BookingsService uses `/api/staff/bookings` for the list and its existing detail route. List responses contain no dashboard summary or breakdown fields.

Deploy the matching backend with Flyway V10 (internal `user_orders` renamed to `bookings`) and the dedicated bookings list and read-only details API with this frontend. Source values are `INTERNAL`/`EXTERNAL`, replacing `CUSTOMER`; statuses are `PENDING`/`CONFIRMED`/`CANCELLED`. External bookings stay separate. Bookings uses server pagination/search and a non-modal detail panel; it does not offer booking mutations.

## Verification

```sh
npm test -- --watch=false --include='src/app/feature/staff/dashboard/**/*.spec.ts' --include='src/app/core/role.guard.spec.ts'
npm run build
```

Nine tests cover API totals, drafts versus applied filters, URL restoration, cancellation, Retry/empty states, reactive-form validation, timezone boundaries, leap years, Reset and configurable parent/child role enforcement.

Desktop (1440px) and mobile (390px) browser checks used mocked report responses: rendering, Apply, refresh, failure/Retry, horizontal overflow and browser exceptions. No live customer data was used.

The issue-5 baseline on 2026-09-16 has 7 failing tests and 110 passing tests (legacy missing fixture inputs/providers and a stale starter title assertion). Compare full-suite results with that baseline. Production builds retain existing login/register stylesheet budget warnings.
