# Standalone Sidebar Migration Plan

**Status:** Implemented and verified on `fix/issue-22-shared-sidebar` for PR #25.

**Goal:** Make navigation a standalone `Sidebar` component that is mounted or removed through one element in `app.html`, independently of routed pages.

**Architecture:** Extract the existing navigation into `layouts/navigation/sidebar`. The root `App` owns only the page outlet and generic side-by-side arrangement. Routing owns authorization and page selection; it no longer instantiates a navigation layout.

**Tech stack:** Existing Angular signals, router, CDK layout, native HTML dialog, CSS, TestBed and Vitest. No new dependencies, navigation service, component registry or replacement-component framework.

## Target integration

`src/app/app.html`:

```html
<div class="app-shell">
  <app-sidebar />
  <div class="content">
    <router-outlet />
  </div>
</div>
```

Add `Sidebar` to the root component imports. The root has no sidebar template reference, component query, state binding or event binding.

Use a native `<dialog>` inside the sidebar for its mobile drawer, opened with `showModal()`. The browser makes the rest of the document inert while the modal is open; no sibling DOM mutation or root `[inert]` binding is needed. Keep drawer state, close/cancel handling, accessible naming, backdrop dismissal, focus return and destruction cleanup inside `Sidebar`. Close an open dialog before switching to desktop, hiding navigation, or destroying the component. Desktop navigation remains non-modal. Share navigation markup internally with an Angular template, keeping only one copy interactive at a time.

**Removal contract:** deleting `<app-sidebar />` leaves the outlet intact, releases all sidebar width and keeps content interactive. Removing the unused component import is optional follow-up cleanup. A later replacement can occupy the same location without exposing navigation state to `App`.

Reference: [native dialog showModal behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).

## Ownership

| Owner | Responsibilities |
| --- | --- |
| `Sidebar` | Branding, role-sensitive links, route context, Profile/My Account, logout, active links, desktop collapse, breakpoint handling, mobile drawer/backdrop, focus trap/return, Escape/navigation dismissal, sticky positioning, internal scrolling and tooltips. |
| `App` | Sidebar integration element, stable root router outlet and generic flexible content sizing. No knowledge of sidebar state. |
| Routes and existing guards | Public URLs, lazy page loading, authentication and per-area role restrictions. |

The sidebar contains no router outlet, page content projection, page form/filter state or application-wide shell wrapper. It continues to use `AuthService`, `PAGE_PATHS` and Angular Router directly.

## Migration steps

### 1. Establish the component and removal contract

- [x] Add root integration tests against the intended template: one sidebar next to the root outlet; no page outlet owned by the sidebar.
- [x] Add a root template-override test that omits the sidebar element. Verify page routing still works with no sidebar-state dependencies.
- [x] Cover removal while a mobile drawer is open in a browser test host. Destroying the sidebar must close/remove its dialog and release modal interaction restrictions.
- [x] Run these tests before implementation and confirm the expected failures.

### 2. Extract sidebar behavior and styles

- [x] Create `src/app/layouts/navigation/sidebar/sidebar.ts`, `sidebar.html`, `sidebar.css` and `sidebar.spec.ts` by moving the navigation portions of `layouts/app-layout`.
- [x] Export `Sidebar`, use selector `app-sidebar`, and remove its `RouterOutlet` dependency.
- [x] Move local desktop/mobile state, current-area detection and router-event cleanup. Preserve dismissal for both `NavigationEnd` and `NavigationSkipped`.
- [x] Replace the mobile CDK focus trap and custom modal backdrop with the internal native dialog and its `::backdrop`. Keep native close/cancel events synchronized with local state. Implement backdrop dismissal explicitly rather than assuming it happens by default; restore focus to the trigger when it still exists.
- [x] Keep desktop positioning on the component host: sticky, `top: 0`, viewport height, `align-self: flex-start`, and no flex shrinking. Its own width follows expanded/compact/mobile state (248/72/48px). The mobile panel remains an internal fixed overlay.
- [x] Keep the toggle outside the scrollable navigation body. Preserve focus outlines and labels outside the scroll container. Do not reintroduce the long-page scrolling defect.

### 3. Move integration to the root without changing authorization

- [x] Add `data.showSidebar: true` to the existing pathless protected route parent in `app.routes.ts` and remove only its `loadComponent: AppLayout` entry.
- [x] Retain that componentless parent, its allowed roles and guard, all existing children, and narrower account/staff/user/legacy guards. In particular, retain staff `canActivateChild` protection.
- [x] Have the sidebar derive visibility from the active primary route ancestry's `showSidebar` marker plus `AuthService.session()`. Read the initial router snapshot and refresh it after successful navigation. A signed-in session alone must not display navigation on standalone registration.
- [x] Keep login/register, the `/users/register` redirect, root redirect and wildcard outside the marked parent.
- [x] Add the target root template without component queries or navigation-state bindings. Keep the root outlet unconditional so changing visibility or collapse state cannot recreate the routed page.
- [x] Move only generic shell/content CSS to `app.css`: a flex row with `min-height: 100dvh`, and content using `flex: 1`, `min-width: 0` and horizontal overflow handling. Do not put sidebar widths, breakpoint classes or navigation selectors in root CSS.
- [x] Hide the sidebar host entirely on public routes or session loss so it reserves no width. Reset its mobile state when hidden; retain desktop collapse state across protected navigation.

### 4. Migrate coverage and remove the old layout

- [x] Move role/link/session/logout/profile/collapse tests into `sidebar.spec.ts` and adapt them to the protected-route marker.
- [x] Update `app.spec.ts` to mount the actual `App` when checking root navigation. `RouterTestingHarness` by itself renders routed pages and will no longer contain the root sidebar; keep it for guard/deep-link checks.
- [x] Assert sidebar identity survives staff → account → legacy navigation, exactly one sidebar appears, public pages reserve no sidebar space, and page edits/query parameters survive toggles.
- [x] Exercise native mobile modality, keyboard focus/return, same-route dismissal, breakpoint changes, session expiry/logout and sidebar removal. Verify actual background interaction blocking in a real browser; modal inertness does not require an `inert` attribute/property on the content element. TestBed checks state/event behavior, not browser focus containment.
- [x] Verify unchanged account, dashboard, bookings and guard tests. Do not weaken assertions merely because the layout ownership moved.
- [x] Delete `src/app/layouts/app-layout/app-layout.ts`, `.html`, `.css` and `.spec.ts` after migration; remove all production imports/references to that layout.
- [x] Update `docs/staff-dashboard.md` to describe root-level sidebar integration and ownership.

### 5. Verify and deliver

```sh
npm test -- --watch=false --include=src/app/app.spec.ts --include=src/app/layouts/navigation/sidebar/sidebar.spec.ts --include=src/app/core/role.guard.spec.ts --include=src/app/shared/feature/auth/auth.routes.spec.ts --include=src/app/shared/feature/account/containers/account/account.spec.ts --include="src/app/feature/staff/**/*.spec.ts"
npm test -- --watch=false
npm run build
```

- [x] Browser-check all supported roles on desktop and mobile: deep links, refresh, back/forward, protected navigation, standalone auth, form/filter preservation and keyboard operation.
- [x] Repeat the populated long-page scroll check, short-viewport navigation scrolling and compact tooltip visibility.
- [x] Verify the removal contract in a browser: without the integration element, content takes the full available width and stays interactive; restoring it restores navigation.
- [x] Compare full-suite results with the recorded 11 pre-existing legacy fixture failures and report any new failures separately. Existing login/register stylesheet warnings are also baseline issues.
- [x] Prepare the verified refactor for commit/push on `fix/issue-22-shared-sidebar` and update PR #25 to describe the standalone component.

## Completion criteria

One sidebar integration element in `app.html`; all navigation implementation in the sidebar directory; no navigation-owned router outlet; no routed layout dependency; removal leaves working full-width pages; existing permissions, navigation behavior, accessibility and sticky scrolling remain intact.

## Verification results

- 79 focused tests passed; production build passed with existing auth stylesheet warnings.
- Full suite: 142 passed, 7 existing legacy fixture failures; no new failing cases.
- Browser checks passed for all supported roles, native modal interaction blocking, Escape/reopen, resize/session cleanup, same-route navigation, sticky scrolling, and Angular component removal/restoration with retained page edits.
- Root template restored after the temporary removal-test harness; its integration is only `<app-sidebar />`.
