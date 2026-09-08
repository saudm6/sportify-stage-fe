# Staff dashboard (issue #4)

Route: `/staff/dashboard`. Started from `origin/main` at `534cb44`.

The dashboard uses the existing booking-report endpoint and Angular stack with no new dependencies. The container owns requests and applied filters; the page component owns presentation. Staff navigation lives in `layouts/staff`.

## Display and filters

- OMR and Asia/Muscat were confirmed by the project owner on 2026-09-08. Amounts display three decimal places. Date presets use Muscat calendar days, with Monday–Sunday weeks.
- Default is the full current month. Concrete applied dates and branch/sport public IDs are saved in URL query parameters; drafts do not change results until Apply. Reset applies the current month and clears branch/sport selections.
- One report response supplies summary and both breakdowns. Paginated entries are never used to calculate metrics. Each bar shows its share of selected confirmed revenue, with exact amounts, counts and averages in text.
- Invalid dates/IDs are rejected before requests. Each URL change or Retry cancels the previous request. Failed requests hide metrics and offer Retry; successful empty reports display API-provided zero values.
- Design uses court blue `#22578b`, pale blue `#e6eff7`, slate `#24374b`, white `#ffffff`, and cool background `#f4f7fa`. Trebuchet MS carries headings and body text; tabular numerals keep monetary values readable. Native form controls and CSS bars avoid a chart or styling dependency.

## Release dependencies

Issue #1 remains open. The client gate recognizes the existing backend `ADMIN` role from the JWT role claim, as either a string or array. Missing, malformed or expired sessions and non-admin roles cannot enter the new staff route. This is navigation control, not server authorization.

The backend report endpoint currently uses only `RequireAuthorization()`. Enforce the corresponding staff policy on the server before release and validate customer denial against the deployed API. This branch does not change the backend or claim deployment verification.

There is no bookings page on main. View bookings is visibly disabled with an explanation. When that page is implemented, replace the disabled control with its RouterLink and pass the container's `applied` filters as query parameters (not the editable form values).

## Verification

```sh
npm test -- --watch=false --include='src/app/feature/staff/dashboard/**/*.spec.ts' --include='src/app/core/staff-access.spec.ts'
npm run build
```

Seven new tests cover API totals, drafts versus applied filters, URL restoration, cancellation, Retry/empty states, invalid ranges, timezone boundaries, leap years, Reset and staff claims.

Desktop (1440px) and mobile (390px) browser checks used mocked report responses: rendering, Apply, refresh, failure/Retry, horizontal overflow and browser exceptions. No live customer data was used.

The complete existing test suite has 11 failures both before and after this change (missing fixture inputs/providers and a stale starter title assertion). Production builds succeed with initial-bundle and existing login/register stylesheet budget warnings.
