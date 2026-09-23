# Staff courts implementation plan

Goal: implement issue #7 using the existing Angular forms, HttpClient and Material dialog stack.

Design: a staff-owned container loads a court table and the API's branch/sport options. Four native selects apply filters; successful saves reload the applied filters. A single add/edit dialog fetches fresh details for edits, keeps branch read-only, and submits exactly three duration prices. Match the staff pages' Trebuchet typography, navy (#24374b), blue (#22578b), white, muted text (#586a7b) and light borders (#d8e2e9). Use a horizontally scrollable table on small screens and a responsive dialog.

- [x] Add integration checks for the routed page, filter requests, create/edit payloads, validation, error retention and staff access.
- [x] Add feature-owned models, API service, container, table component and dialog under `src/app/feature/staff/courts`.
- [x] Register `/staff/courts` beneath existing staff guards and add its sidebar link.
- [x] Run focused Angular tests, the full suite and production build. Verify dialog focus, Escape, restoration and mobile layout in a real browser.
- [x] Review the implementation and fix successful-save focus restoration.

Delivery: commit and push `feat/issue-7-staff-courts`, then open a PR closing #7.

Validation: names are required, nonblank and at most 150 characters. Prices are required, nonnegative, at most 9,999,999.999 and limited to three decimal places, matching backend decimal(10,3). Branch is create-only; status is edit-only. Details must load before editing or saving. Keep edits on 400/404/409/network errors, show backend validation messages and sport conflicts, prevent duplicate submissions and dismissal during a save. Staff routes use existing role guards; backend feature permissions remain authoritative.

Scope: no search, pagination or delete because these endpoints do not support them. Court descriptions, location text, assigned add-ons and price history require future court-detail API contracts and are outside these dialogs.

Baseline at `4857599`: 148 passing tests and six pre-existing legacy/user setup failures (missing required inputs/providers). No frontend AGENTS.md exists in this checkout; follow the issue's feature ownership instructions.

Final verification: 12 new integration tests pass; full suite has 160 passing tests and the same six baseline failures. Production build passes with existing login/register stylesheet budget warnings. Chromium browser checks with mocked API responses pass at 1440px and 390px, including focus trapping, Escape/cancel restoration, successful-save focus, public-ID filters, detail loading, sport conflicts and inactive saves. Live backend persistence was not exercised.
