# Shared My Account Implementation Plan

> **Execution update — 2026-09-15:** The owner approved implementation and desktop testing as Admin and User. Implementation is complete on local feature branches; verification and deviations are recorded below. The original task checklists remain as the planning reference.

**Goal:** Complete [frontend issue #2](https://github.com/saudm6/sportify-stage-fe/issues/2): one `/account` page where customers and staff view roles and edit their own name, email and contact number.

**Architecture:** Add one feature under `shared/feature/account`, with a container owning the form and requests, a presentation component, feature-owned models and a thin HTTP service. Add authenticated GET/PATCH `/api/users/me` adapters in the backend, reusing the existing profile query, update command and ownership rules. The server resolves the public ID from the authenticated principal; the frontend never supplies an account ID.

**Tech Stack:** Existing Angular 21, reactive forms, signals, RxJS, HttpClient and Vitest; existing .NET/MediatR/FluentValidation backend. Native HTML and CSS. No new dependencies.

## Global constraints and approved decision

- On 2026-09-15 the owner selected: **“Add a self-profile endpoint; preserve admin access elsewhere.”** This resolves the issue's older self-only wording: `/me` always accesses the caller, while existing ID routes retain authorized same-company ADMIN access. Cross-company access remains forbidden.
- Both `USER` and staff roles (`ADMIN`, `FINANCE`, `SUPERVISOR`) use the same page. Do not require a staff dashboard feature permission for My Account.
- Keep containers, components, services and models inside their owning feature. Shared validators stay in `shared/functions`.
- No role editing, role-toggle calls, password changes, deletion, company switching, new state framework, autosave, optimistic updates or persisted drafts.
- Do not render public IDs, numeric role/database IDs or password hashes. PATCH contains exactly `name`, `contactNumber`, `email`.
- Cancel stays on the page and restores the last successful GET/PATCH response. Failed saves retain entered values.
- Backend `AGENTS.md` requires endpoint → command/query → service → repository flow and currently prohibits adding backend tests/testing infrastructure. Use its prescribed build and manual checks. Frontend tests use the installed runner.
- The issue references frontend `AGENTS.md`, but none exists in this checkout, its ancestor directories, tracked files or the GitHub contents lookup. Follow the issue's quoted structure and current implementation patterns; recheck instructions when executing.

## Evidence from the current code

Inspected frontend `4d2105a09f6a9ee69ea472849f8ca074bca6ceb9` and backend `06a9c22` on 2026-09-15. Both worktrees were clean before writing this document.

- [Issue #1](https://github.com/saudm6/sportify-stage-fe/issues/1) is CLOSED. `core/auth.service.ts`, `role.guard.ts` and `auth.interceptor.ts` already handle session restoration, route access, bearer tokens, expiry and API 401 logout.
- `AuthService` stores token, roles and expiry, but not the subject/public ID. `/me` makes additional frontend decoding/storage unnecessary. Preserve existing login behavior and tests.
- `layouts/navigation/nav-bar.html` is shared globally through `app.html`. It has Sign out, but no profile menu or My Account link.
- `feature/user/service/user.service.ts` uses legacy `id/fullName/createdAt` models; its edit-dialog callers depend on that contract. It cannot safely serve this feature. Leave that unrelated flow alone.
- Backend `Endpoint/UsersEndpoint.cs` currently exposes GUID-based GET/PATCH only. `BookingUserService.CompanyForProfileAsync` allows self access or a current same-company ADMIN; `AccessService.GetAuthenticatedUserId()` already resolves and validates the principal's public ID.
- Existing `UserDetailsResponse` is `{ publicId, name, contactNumber, email, roles }`; each role is `{ roleId, roleName, isActive }`. GET and PATCH return the same response. Backend update trims name/contact and lowercases/trims email.
- Update validation limits: name 150, contact number 30, email 255 characters. Duplicate email/contact yield 409; field validation yields 400 Problem Details with an `errors` dictionary.

### Context7 decisions

Consulted official Angular documentation through Context7 (`/websites/angular_dev`) for the existing Angular 21 app. Keep established APIs; no version upgrade is needed.

- Use `FormBuilder.nonNullable` and **explicit** `form.reset(savedValues)`. A bare reset restores initial construction values, not the latest server response. [FormBuilder](https://angular.dev/api/forms/FormBuilder), [FormControl reset](https://angular.dev/api/forms/FormControl).
- Use the current HTTP test backend. Register `provideHttpClient()` before `provideHttpClientTesting()`, intercept with `HttpTestingController`, and simulate status codes with `flush`. [HTTP testing](https://angular.dev/guide/http/testing).

## File map

Paths below are relative to `E:/sportify/28_8_2026/sportify-stage-fe` unless marked backend.

| Action | File | Responsibility |
|---|---|---|
| Modify, backend | `E:/sportify/28_8_2026/sportify-stage-be/Test.Application/Endpoint/UsersEndpoint.cs` | Two authenticated self-profile adapters |
| Create | `src/app/shared/feature/account/models/account-profile.ts` | Display response and three-field update contract |
| Create | `src/app/shared/feature/account/service/account-api.service.ts` | GET/PATCH `/users/me` |
| Create | `src/app/shared/feature/account/containers/account/account.ts` | Form, saved snapshot, request states and actions; short inline child binding |
| Create | `src/app/shared/feature/account/containers/account/account.spec.ts` | Focused real-HTTP form/request regression checks |
| Create | `src/app/shared/feature/account/components/account-page/account-page.ts` | Inputs and outputs only |
| Create | `src/app/shared/feature/account/components/account-page/account-page.html` | Form, roles and status rendering |
| Create | `src/app/shared/feature/account/components/account-page/account-page.css` | Small responsive page styles |
| Modify | `src/app/core/urls.ts` | Add `PAGE_PATHS.account` |
| Modify | `src/app/app.routes.ts` | Guarded lazy `/account` route |
| Modify | `src/app/layouts/navigation/nav-bar.html` | Shared Profile disclosure and My Account link |
| Modify | `src/app/layouts/navigation/nav-bar.css` | Profile disclosure layout/focus |
| Modify | `src/app/layouts/navigation/nav-bar.spec.ts` | Link visibility for every supported role |

Do not add a routing module, route file for a single page, barrel files, generic form builder, global profile store or a new auth guard. The dashboard already demonstrates a small signal-based container with inline presentation binding.

## Task 1: Make the backend self-profile contract available

**Interface produced:** authenticated GET and PATCH `/api/users/me`; 200 `UserDetailsResponse`, existing 400/401/403/404/409 problem responses.

- [ ] Recheck backend instructions/status. Add `using Test.Application.Service;` and these two handlers to the existing authorized `/api/users` group:

```csharp
group.MapGet("/me", async (
    AccessService access, ISender sender, CancellationToken cancellationToken) =>
{
    var user = await sender.Send(
        new GetUserByPublicIdQuery(access.GetAuthenticatedUserId()), cancellationToken);
    return Results.Ok(user);
}).Produces<UserDetailsResponse>();

group.MapPatch("/me", async (
    UpdateUserDataRequest request, AccessService access,
    ISender sender, CancellationToken cancellationToken) =>
{
    var user = await sender.Send(new UpdateUserDataCommand(
        access.GetAuthenticatedUserId(), request.Name, request.ContactNumber, request.Email),
        cancellationToken);
    return Results.Ok(user);
}).Produces<UserDetailsResponse>();
```

The existing `/{publicId:guid}` constraint distinguishes GUID routes from `/me`. No new service, DTO, database migration or ownership implementation is needed. Query/body fields claiming another public ID must never affect target selection; signature validation remains the JWT middleware's responsibility.

- [ ] Run `dotnet build test.slnx` from the backend root. Expected: exit 0.
- [ ] Against an isolated test database, sign in as synthetic USER and each staff role. For each, GET `/me` must identify the caller; PATCH must update only that caller and return normalized values. Check missing/expired credentials → 401, deleted caller → 404, invalid fields → 400, duplicate email/contact → 409.
- [ ] Tamper with a `publicId` query parameter and extra body property: no other account may be read/changed. Check old GUID routes still reject non-admin access to another user and cross-company admin access, while allowing authorized same-company admin access. Check forged bearer tokens fail authentication. Verify other accounts remain unchanged in the database.
- [ ] Keep the backend change in a separate reviewable commit, suggested message `feat: add authenticated self-profile endpoints`. This dependency must be available in the target API before the frontend is released. Do not silently fall back to GUID endpoints.

## Task 2: Build the shared account form and request cycle

**Interfaces:** `AccountApiService.load(): Observable<AccountProfile>` and `save(request: UpdateAccountRequest): Observable<AccountProfile>`. `Account` exposes `form`, `profile`, `loading`, `saving`, `error`, `success`, `unavailable`, plus `load()`, `save()` and `cancel()`. `AccountPage` receives those display/form inputs and emits `retried`, `submitted`, `cancelled`.

- [ ] Define the two feature models in `models/account-profile.ts`:

```ts
export interface UpdateAccountRequest {
  name: string;
  contactNumber: string;
  email: string;
}

export interface AccountProfile extends UpdateAccountRequest {
  publicId: string;
  roles: { roleName: string; isActive: boolean }[];
}
```

The narrow role type deliberately omits backend `roleId`; do not claim this removes it from the network response. Render only explicit fields, never a raw object dump.

- [ ] Implement the service with `@Injectable({ providedIn: 'root' })`, `private readonly http = inject(HttpClient)` and `private readonly url = API_BASE_URL + '/users/me'`. Import `API_BASE_URL` from `../../../../core/urls` and the two models from `../models/account-profile`. The methods are:

```ts
load(): Observable<AccountProfile> {
  return this.http.get<AccountProfile>(this.url);
}

save({ name, contactNumber, email }: UpdateAccountRequest): Observable<AccountProfile> {
  return this.http.patch<AccountProfile>(this.url, { name, contactNumber, email });
}
```

- [ ] Start with the focused regression below in `containers/account/account.spec.ts`, then run the focused command in Task 4. Before implementation it must fail; after implementation it must pass. TestBed uses the real `Account` and `AccountApiService`, with the HTTP testing backend:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../../core/urls';
import { Account } from './account';

describe('My Account', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Account],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('keeps failed edits and cancels to the latest server-confirmed values', () => {
    const fixture = TestBed.createComponent(Account);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const url = `${API_BASE_URL}/users/me`;
    const original = {
      publicId: 'dcb4da6e-cac9-48aa-b383-28f3a64c2ba1',
      name: 'Test User', contactNumber: '+96890000001', email: 'one@example.com',
      roles: [{ roleName: 'USER', isActive: true }],
    };
    fixture.detectChanges();
    http.expectOne(url).flush(original);
    page.form.controls.name.setValue('Edited User');
    page.save();
    const failed = http.expectOne(url);
    expect(failed.request.method).toBe('PATCH');
    expect(Object.keys(failed.request.body).sort()).toEqual(['contactNumber', 'email', 'name']);
    page.save();
    http.expectNone(url); // The first request is already matched; no second submission.
    failed.flush({}, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('Edited User');
    expect(page.saving()).toBe(false);
    page.cancel();
    expect(page.form.controls.name.value).toBe('Test User');
    page.form.controls.name.setValue(' Saved User ');
    page.save();
    http.expectOne(url).flush({ ...original, name: 'Saved User' });
    expect(page.success()).toBe('Account updated successfully.');
    page.form.controls.name.setValue('Unsaved');
    page.cancel();
    expect(page.form.controls.name.value).toBe('Saved User');
    expect(page.form.pristine).toBe(true);
    expect(page.form.untouched).toBe(true);
    fixture.destroy();
  });
});
```

- [ ] Create the non-nullable form in `Account`, reusing `notBlank` from `../../../../functions`. Use these exact validators:

```ts
readonly form = inject(FormBuilder).nonNullable.group({
  name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
  contactNumber: ['', [Validators.required, notBlank, Validators.maxLength(30)]],
  email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
});
```

- [ ] Keep `profile = signal<AccountProfile | null>(null)` as the last server-confirmed snapshot; use boolean signals for loading/saving/unavailable and strings for error/success. Call `load()` once in the constructor. Never bind the editable form directly to the snapshot object.
- [ ] Implement the following request transitions. Both subscriptions use `takeUntilDestroyed(inject(DestroyRef))` with the DestroyRef captured in a field, and `finalize` to clear the appropriate busy flag. Neither failed save nor Cancel sends a GET.

| Action | Exact behavior |
|---|---|
| `load()` | Ignore while loading/saving. Set loading, clear load error/unavailable; GET once. On success store response and reset the three form fields from it. On error expose the status below, without showing an editable empty form. |
| `save()` | Ignore while loading/saving, with no loaded profile, or when unavailable. If invalid, mark all controls touched and stop. Set saving and clear messages. Send the three values from `getRawValue()`, trimming name/contact/email in the request object only. |
| PATCH success | Replace the snapshot with the server response; reset form from its three values; set `Account updated successfully.`. Use the response's normalization rather than assuming the request is the stored result. |
| PATCH failure | Leave form and snapshot intact. Set safe feedback using the table below; finalize clears saving. Never automatically retry a mutation. |
| `cancel()` | Ignore while loading/saving or with no snapshot. Reset the three fields from the snapshot and clear error/success. Remain at `/account`. |
| Next field edit | Clear stale success text. Use `form.valueChanges.pipe(takeUntilDestroyed(destroyRef))`; no draft persistence. |
| Destroy | Cancel pending subscriptions; a later response must not update a departed page. |

The shared reset operation is only this method inside the container, used after successful requests and Cancel:

```ts
private restore(profile: AccountProfile): void {
  this.form.reset({
    name: profile.name, contactNumber: profile.contactNumber, email: profile.email,
  });
}
```

- [ ] Keep error decisions in the container. Reuse the registration container's allowlisted 400/409 mapping pattern, reduced to `Name → name`, `ContactNumber → contactNumber`, `Email → email`. Accept only nonempty string arrays in `errors`; mark mapped controls touched and assign a `server` error. An edited control clears its old server error through validation. Unknown/malformed details produce fixed fallback copy, never raw server HTML or exception text.

| Failure | Feedback and behavior |
|---|---|
| 400 with recognized fields | Show each server message beside its field; retain edits. Unknown keys/malformed payload also show `Unable to save your account. Please try again.` |
| 409 known email/contact detail | Map the existing exact messages `A user with this email already exists.` / `A user with this contact number already exists.` to that field. |
| Other 409 | `An account with this email or contact number already exists.`; retain edits. |
| 401 | Existing interceptor signs out and navigates to Login. Container fallback: `Your session has expired. Please sign in again.`; disable further submission. |
| 403 | `You do not have access to this profile.`; no mutation retry, retain any edits, set unavailable. |
| 404 or empty/null successful response | `Your profile could not be found.`; no editable blank form. If this follows a save, keep visible edits read-only and set unavailable. Never treat null as successful save. |
| Network/5xx while loading | `Unable to load your account. Please try again.` with Retry; form stays hidden. |
| Network/5xx while saving | `Unable to save your account. Please try again.`; keep edits and enable manual retry. |

- [ ] Build `AccountPage` using the registration page's input/output and field-error presentation pattern. Container supplies field-error strings, including required/blank, maxlength, email and server errors; ensure reactive updates on touched/error changes as registration does with form/control events. Labels are **Name**, **Email address**, **Contact number**, and **Roles**. Use text/email/tel inputs with matching autocomplete, length limits, associated labels, `aria-invalid`, `aria-describedby`, visible focus and inline error IDs.
- [ ] Render one `<main>` with an h1 **My Account**, a single-column form of comfortable width, and native Save/Cancel buttons. Save is `type="submit"`; Cancel is `type="button"`. Inputs are read-only while saving or unavailable; both actions are disabled while busy, and Save also when unavailable. Invalid submission remains possible so it can expose validation messages. Roles are text entries `roleName — Active/Inactive`, never inputs; empty roles show **No roles assigned.**
- [ ] Use `aria-busy` and **Loading your account…** / **Saving…**; error banners have `role="alert"`, success has `role="status"`. Show Retry only after a retryable initial load failure. Retain current app colors, readable contrast and a max-width card with mobile padding; no new style package, decorative dashboard or table for three fields.
- [ ] In the same focused spec, cover 400 mapping/correction, 403/404/401 states, null response, required/blank/length/email validation, network failure/retry, read-only roles and request cancellation on destroy. Use parameterized cases where useful; do not create a new testing framework or per-method test files.
- [ ] Commit the independently tested feature, suggested message `feat: add shared account form`.

## Task 3: Expose the shared route and profile menu

- [ ] Add `account: 'account'` to `PAGE_PATHS`. Import `roleGuard` into `app.routes.ts` and insert this entry before the catch-all route:

```ts
{
  path: PAGE_PATHS.account,
  canActivate: [roleGuard],
  data: { allowedRoles: ['USER', 'ADMIN', 'FINANCE', 'SUPERVISOR'] },
  loadComponent: () => import('./shared/feature/account/containers/account/account')
    .then(m => m.Account),
},
```

- [ ] Replace the existing shared Sign out button with a native Profile disclosure containing My Account and Sign out. Keep it outside role-specific conditionals but inside the signed-in block:

```html
<details class="profile-menu" #profileMenu>
  <summary class="navbar-link">Profile</summary>
  <div class="profile-menu-links">
    <a class="navbar-link" [routerLink]="['/' + paths.account]"
       routerLinkActive="active" ariaCurrentWhenActive="page"
       (click)="profileMenu.open = false">My Account</a>
    <button class="navbar-link" type="button" (click)="auth.logout()">Sign out</button>
  </div>
</details>
```

Use the native disclosure semantics without adding ARIA menu roles or custom keyboard handlers. Add only these layout rules to existing navbar styles:

```css
.profile-menu { position: relative; }
.profile-menu-links {
  position: absolute;
  inset-inline-end: 0;
  display: grid;
  min-width: 10rem;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
```

- [ ] Extend `nav-bar.spec.ts`: signed-out users see no Profile menu; each supported role and a dual-role session can open it and follow `/account`; Sign out still works. Keep existing navigation expectations.
- [ ] Add a route-focused section to the account spec using `RouterTestingHarness`, actual app routes and real `AuthService`/interceptor with the testing HTTP backend. Assert direct `/account` and refresh work for each supported role, `/account?publicId=someone-else` still issues only `/users/me`, and signed-out access redirects to Login without a profile request. A GET/PATCH 401 must exercise the existing logout redirect. Do not mistake frontend mocks for backend ownership verification.
- [ ] Commit route/navigation integration, suggested message `feat: link shared account page from profile menu`.

## Task 4: Verify acceptance and release dependency

Run from `E:/sportify/28_8_2026/sportify-stage-fe` after implementation:

```powershell
npm test -- --watch=false --include='src/app/shared/feature/account/**/*.spec.ts' --include='src/app/core/**/*.spec.ts' --include='src/app/layouts/navigation/**/*.spec.ts'
npm run build
git diff --check
```

- [ ] Before implementation, run existing core/navigation tests once to establish the baseline. After implementation, commands above must exit 0; record pre-existing warnings separately, without changing budgets to hide them.
- [ ] At desktop and 390px width, verify menu keyboard operation, focus, field labels, no horizontal overflow, pending states, readable roles, status announcements and Save/Cancel after both success and failure.
- [ ] In a safe test environment, perform load → edit → Cancel; edit → failed save → correct → success → edit → Cancel. Confirm failure retains exact edits and the final Cancel restores normalized server-saved values. Refresh confirms persistence. Editing email must not synthesize a token or force an unnecessary sign-out; the server identifies the user by public ID.
- [ ] Repeat for customer and staff accounts, including FINANCE/SUPERVISOR without dashboard permissions. Verify no role-toggle, password or delete request and no internal ID/hash in the DOM.
- [ ] Finish the Task 1 ownership checks against the target API version. The frontend can be developed with HTTP test responses while `/me` is pending, but it cannot be released against an API lacking those endpoints.

### Acceptance coverage

| Issue requirement | Covered by |
|---|---|
| Same feature for staff and customers | Tasks 2–3; shared route and all-role checks |
| Load/save/cancel and validation/conflict/unauthorized/missing states | Task 2 transitions/error table; Task 4 interaction checks |
| Cancel restores last loaded/saved values; failures preserve edits | Task 2 regression and snapshot rules |
| Changing request identity cannot expose another profile | Task 1 `/me` identity derivation and real API checks, with approved admin exception on existing routes |
| No role editing, password hash or internal database ID appears | Narrow display model, explicit template and request-body assertions |

**Planning verification:** Requirements, caller contracts, backend response shapes, validators and existing frontend patterns were inspected. Only this plan was added. Application builds/tests and new endpoint behavior are execution checks above, not claims made by this planning task.

## Execution record — 2026-09-15

- Implemented the shared account feature, guarded route, native Profile disclosure and two backend `/me` adapters. No dependencies added. Existing auth/token handling and company-admin management remain in place.
- Review found a missing Dashboard link for staff on `/account`; fixed for ADMIN/FINANCE/SUPERVISOR with three regression cases. Mobile verification found left-edge clipping in the Profile disclosure; fixed with mobile alignment and a browser bounds assertion.
- Focused checks: **49 passed**. Production Angular build and isolated backend solution build pass. Frontend warnings are the existing login/register CSS budgets; backend warnings are existing package/nullability warnings.
- Whole-suite comparison: current branch **107 passed / 7 failed**, unchanged `4d2105a` baseline **80 passed / 7 failed**. The seven failing test names are identical: legacy order/order-line/product pages and user list/dialog setup specs. No new full-suite failures.
- Native Windows mouse/keyboard desktop testing created and signed in synthetic USER and ADMIN accounts, navigated through Profile, verified read-only roles, Save, success feedback, Cancel, persistence on refresh, and a real Admin duplicate-email failure preserving edits.
- Additional Chrome automation at 390px passed for both roles: menu bounds, real duplicate conflict/preservation/Cancel, all three fields updated, server normalization, refresh, login using the changed email, and restoration of synthetic test values. Simulated HTTP 500 verified Retry and simulated 401 verified logout; no browser page errors.
- Real API checks passed: authenticated self reads, anonymous 401, invalid/malformed payload 400, duplicate 409, non-admin foreign-profile 403, ignored query/body identity tampering, forged/unsigned token 401, same-company ADMIN access 200 and cross-company ADMIN denial 404. Two additional synthetic staff accounts were used for company isolation.
- Runtime deviation: automatic approval review blocked restarting the existing server. A separate updated API runs on **5212**, with a built-app preview on **4202**. Its local proxy substitutes the API address only in served build assets; source configuration and existing servers on 4200/5210 are unchanged. Release still requires deploying/restarting the updated backend.
- Frontend branch `feat/issue-2-my-account` and backend branch `feat/issue-2-self-profile` target `main`. Deploy the backend endpoints before the frontend. The subsequent admin role-only permissions request is tracked separately in [backend issue #9](https://github.com/saudm6/sportify-stage-be/issues/9) and is not implemented here.
- Detailed logs, screenshots, runnable browser check and backend outcomes are under `E:/sportify/28_8_2026/build-artifacts/issue-2-*`; summary: `issue-2-result.md`.
