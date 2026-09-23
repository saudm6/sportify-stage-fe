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

## Shared popup follow-up

User selected option 1: rename the form to `CourtPopup` (`courtpopup.*`) and import common behavior. `shared/functions/popup.ts` provides an opener created in a component field initializer; it owns sizing, initial focus and cleanup when the owning component is destroyed. `shared/components/popup` provides the title, projected content, native submit form, loading/error display, buttons and save-time dismissal protection. Court fields, validation and API calls remain in `CourtPopup`. Features supply form controls within the shared form rather than nesting another form.

Verification: 14 focused tests pass, covering the shared popup with separate example content and the court workflows. Full suite: 162 passing and the same six baseline failures. Build and desktop/mobile browser checks pass, including Enter submission and Escape/Cancel protection while saving. Configuration-generated forms (option 2) are deferred to a separate GitHub issue.
