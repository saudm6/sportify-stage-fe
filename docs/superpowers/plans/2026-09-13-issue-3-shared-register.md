# Shared Customer Registration Implementation Plan

> **Prototype update — 2026-09-15:** The [role/company registration plan](2026-09-15-prototype-role-company-registration.md) supersedes this plan's customer-only scope and hardcoded numeric role mapping. Options now come from the API, staff require a company, and protected backend operations enforce company isolation. The older verification below records the original implementation only.

> **Owner update — 2026-09-15:** Successful registration now redirects directly to `/login`, without a query parameter or success banner. This supersedes the message handoff described below. Name and contact number use the shared `notBlank` validator, which reuses `contains(/\S/, 'blank')`.

> **For agentic workers:** The owner approved implementation on 2026-09-13. Implemented on branch `feat/issue-3-shared-register`; completed steps are checked below.

**Goal:** Complete frontend [issue #3](https://github.com/saudm6/sportify-stage-fe/issues/3): public customer registration, field validation, safe role assignment, and a return to Login with a success message.

**Architecture:** Extend the existing `shared/feature/auth` feature. Keep forms, API calls and request state in `RegisterUserList`; keep rendering and input/output bindings in `RegisterUserPage`. Reuse `AuthApiService`, RxAngular state, reactive forms, the password `contains` validator and the existing auth styling.

**Tech Stack:** Existing Angular 21, TypeScript, reactive forms, RxAngular, RxJS, CSS and Vitest. No new dependencies.

## Global constraints

- Follow `E:/sportify/28_8_2026/sportify-stage-fe/AGENTS.md`. Registration remains a complete shared feature; do not create another registration page under staff/customer or move unrelated features.
- Containers own API loading, state and actions. Components receive inputs and emit actions. Services and models stay inside the auth feature.
- Keep each component's TypeScript, HTML, CSS and relevant tests together. Preserve existing names and folders.
- Register only customer accounts. No role selector, staff provisioning, People & Access, verification email, password recovery or automatic login.
- The backend remains the security boundary. A frontend constant is request configuration, never permission enforcement.
- Keep passwords out of URLs, logs, browser storage and navigation state. Confirmation is local only.
- Implementation changes only this plan and the frontend files listed below. Preserve the existing untracked `AGENTS.md` and earlier plan; do not stage them incidentally.

## Current evidence and dependencies

Inspected frontend branch `fix/issue-1-login` at `42c750de01c7256b72cd20b104cb3a42cd0d5ec6`. GitHub issue #1 is closed as completed, and its shared login/session implementation is present locally.

The current registration route is `/users/register`. Its request incorrectly sends `fullName`, email and password. It lacks contact number and confirmation, and its response model assumes fields the backend does not return. Duplicate-submit protection already exists and should be retained. Errors are currently flattened into a banner and successful registration navigates to Login without a message.

Inspected backend branch `feat/staff-feature-authorization` at `4623dc91339764f9574a3cc0e42187b0a1e32a89`:

- `Test.Application/Endpoint/AccountEndpoints.cs`: anonymous `POST /api/account/register`, HTTP 201 with `UserDetailsResponse`; no login token.
- `Test.Application/Service/AccountService.cs`: resolves the supplied role ID and permits only a role whose name is exactly `USER`. Unknown positive IDs and privileged roles receive generic HTTP 403 before insertion.
- `Test.Application/UserCases/Accounts/Commands/RegisterAccount/RegisterAccountCommand.cs`: actual field validation rules.
- `Test.Web/Abstraction/GlobalExceptionHandler.cs`: HTTP 400 uses an `errors` dictionary with PascalCase property names; duplicate values produce HTTP 409 with `detail`.
- `docs/reviews/2026-09-12-staff-authorization-verification.md`: existing isolated integration evidence for successful USER registration and denied privileged registration. This is historical evidence, not verification of the currently deployed endpoint.

**Verified prerequisite:** On 2026-09-13, a read-only query against the project development database, using the backend project's configured user-secrets connection, returned exactly one row: `id = 1`, `role_name = USER`. The frontend service uses that verified value. No account data was read or changed by this query. Other deployment environments must verify their mapping before release.

**Recommended approach:** Keep the existing API contract and its server-side USER restriction; verify the target database's USER ID and use it only in the auth API service. This is the smallest compatible frontend change. If environments use different IDs, a separate backend change to assign USER by name and remove `roleId` from public registration is preferable to inventing a frontend role-discovery endpoint. That API change is an alternative dependency, not part of this frontend plan.

## File map

All frontend paths below are relative to `E:/sportify/28_8_2026/sportify-stage-fe/`.

| File | Planned responsibility/change |
| --- | --- |
| `src/app/core/urls.ts` | Change the canonical register path to `register`. |
| `src/app/shared/feature/auth/auth.routes.ts` | Keep the existing lazy-loaded registration container; add a full-match redirect from `users/register`. |
| `src/app/shared/feature/auth/models/register-user-request.ts` | Use the backend request names and required role ID. |
| `src/app/shared/feature/auth/models/registration-response.ts` | Match the returned public ID, customer details and role assignments. |
| `src/app/shared/feature/auth/service/auth-api.service.ts` | Own the verified customer role ID and construct the exact POST body. |
| `src/app/shared/feature/auth/containers/register-user-list/register-user-list.ts` | Form rules, explicit payload, submission lifecycle, field/server errors and success navigation. |
| `src/app/shared/feature/auth/components/register-user-page/register-user-page.ts` | Retain presentation inputs/outputs; remove the unused `Form` import; import RouterLink and expose paths for the Login link. |
| `src/app/shared/feature/auth/components/register-user-page/register-user-page.html` | Five labeled fields, accessible errors, pending state and Login link. |
| `src/app/shared/feature/auth/components/register-user-page/register-user-page.css` | Only necessary link, confirmation-error and responsive styling adjustments. |
| `src/app/shared/feature/auth/containers/login-user-list/login-user-list.ts` | Read the registration-success navigation marker. |
| `src/app/shared/feature/auth/containers/login-user-list/login-user-list.html` | Pass success text to the existing page component. |
| `src/app/shared/feature/auth/components/login-user-page/login-user-page.ts` | Add a success-message input. |
| `src/app/shared/feature/auth/components/login-user-page/login-user-page.html` | Show a fixed accessible success message. |
| `src/app/shared/feature/auth/components/login-user-page/login-user-page.css` | Small success-message style using existing colors and spacing. |
| Existing login/register container and page `.spec.ts` files | Extend existing checks for the new behavior; no new test framework. |
| `src/app/shared/feature/auth/auth.routes.spec.ts` (new) | Check direct anonymous registration and the compatibility redirect. |

Reuse `RegisterUserList`'s existing container HTML bindings, `src/app/shared/functions/contains.ts`, `AuthService`, and the interceptor. No changes are expected there. The existing Login link and `AllUsersList.registerUser()` already read `PAGE_PATHS.register`, so they follow the new canonical URL without a second implementation.

## Task 1: Verify the role contract and correct the API models

**Files:** The two auth models and `auth-api.service.ts` listed above; registration container spec for the HTTP contract check.

- [x] Query the intended environment with an available authorized read-only database connection:

```sql
SELECT id, role_name
FROM booking_system.roles
WHERE role_name = 'USER';
```

Expected: exactly one row with a positive ID representable as a safe JavaScript integer. Record the non-secret ID, environment and verification date in this plan. The checked-in backend validates the role name, so a wrong ID must fail closed. If database access is unavailable, obtain the verified result from the owner before implementing the request constant. Planning can finish without guessing it.

- [ ] Release prerequisite: confirm that the deployed target API includes the inspected USER-only guard before exposing working registration. Local branch contents alone do not establish deployment. No new backend code is expected if that guard is already deployed.
- [x] Replace the incorrect models with these contracts:

```ts
export interface RegisterUserRequest {
  contactNumber: string;
  name: string;
  email: string;
  password: string;
  roleId: number;
}
```

```ts
export interface RegistrationResponse {
  publicId: string;
  name: string;
  contactNumber: string;
  email: string;
  roles: { roleId: number; roleName: string; isActive: boolean }[];
}
```

- [x] In `auth-api.service.ts`, declare module-local `customerRoleId` using the actual numeric result from the query. Add a short comment identifying the verified USER mapping and environment. This step intentionally depends on the query; there is no default/fallback role ID.
- [x] Keep role selection out of the container by changing the service boundary to:

```ts
registerUser(request: Omit<RegisterUserRequest, 'roleId'>): Observable<RegistrationResponse> {
  const { contactNumber, name, email, password } = request;
  return this.httpClient.post<RegistrationResponse>(AUTH_API_URLS.register, {
    contactNumber, name, email, password, roleId: customerRoleId,
  });
}
```

Explicit construction also prevents extra form properties from becoming API fields. Reuse the installed HttpClient; no registration configuration service, generic mapper or role API.

- [x] Replace the registration container's creation-only mock test with HttpClient testing providers, following `login-user-list.spec.ts`. Assert POST method, exact body keys, the verified USER ID, and no `fullName`, `confirmPassword` or token acceptance. Feed the real HTTP 201 response shape.

## Task 2: Complete the registration form and error handling

**Files:** Existing registration container, page and their specs.

**Inputs/outputs:** Preserve `userForm`, `isSubmitting`, `errorMessage`, `submitted` and `cancelled`. The page has no API service or navigation side effects beyond RouterLink.

- [x] Rename the form field `fullName` to `name`; add `contactNumber` and `confirmPassword`. Keep validators in TypeScript. Use `Validators.required`, `Validators.maxLength`, existing `contains`, and a group validator:

```ts
readonly userForm = this.formBuilder.nonNullable.group({
  name: ['', [Validators.required, contains(/\S/, 'blank')]],
  contactNumber: ['', [Validators.required, Validators.maxLength(30), contains(/\S/, 'blank')]],
  email: ['', [Validators.required, Validators.email]],
  password: ['', [
    Validators.required, Validators.minLength(8),
    contains(/[A-Z]/, 'uppercase'), contains(/[a-z]/, 'lowercase'), contains(/[0-9]/, 'number'),
  ]],
  confirmPassword: ['', Validators.required],
}, {
  validators: form => form.get('password')?.value === form.get('confirmPassword')?.value
    ? null : { passwordMismatch: true },
});
```

Contact number stays a string, preserving `+` and leading zeroes. Do not invent an Oman-only phone pattern or extra password rules. Do not trim passwords or confirmation. Trim name/contact in the submitted payload; the backend already normalizes email.

- [x] Keep the existing submit guard and `finalize` reset. Check `isSubmitting` before processing another submit, mark invalid controls touched, and make no request for invalid/mismatched input. Add `DestroyRef` and `takeUntilDestroyed` as the login container already does, so leaving the page cancels the subscription and cannot cause a later success redirect.
- [x] Build the form-to-service payload explicitly:

```ts
const { name, contactNumber, email, password } = this.userForm.getRawValue();
this.authService.registerUser({
  name: name.trim(), contactNumber: contactNumber.trim(), email, password,
});
```

Integrate this call into the existing subscription pipeline, not as a second request. Preserve all five form values on an error. Do not reset the form, log the HTTP error/request, or write registration data to storage.

- [x] Handle errors inside this container, using `HttpErrorResponse` and the actual backend response shapes:

| Response | Behavior |
| --- | --- |
| 400 with `errors.Name`, `ContactNumber`, `Email`, `Password` | Map through an explicit four-field map to form controls. Accept only string arrays; join messages and set a `server` control error. Mark the control touched and render the error beside it. |
| 400 with unknown keys, including `RoleId`, or malformed errors | Show `Unable to create your account. Please try again.`; never invent a role field. Known-field errors can still render alongside a general error. |
| 409 detail `A user with this email already exists.` | Set an email `server` error with that message. |
| 409 detail `A user with this contact number already exists.` | Set a contact-number `server` error with that message. |
| Other 409, including database unique-constraint races | Show `An account with this email or contact number already exists.` in the banner. |
| 403 | Show `Registration is unavailable. Please contact support.`; no retry with another role. |
| Status 0 or 5xx | Show `The server is unavailable. Please try again.` and enable retry. |
| Other/malformed failure | Show `Unable to create your account. Please try again.` |

Use an explicit mapping such as `{ Name: 'name', ContactNumber: 'contactNumber', Email: 'email', Password: 'password' }`; do not dynamically index arbitrary backend property names. Updating a control runs its validators and clears its old server error. Group confirmation validation must re-evaluate when either password changes. Generic request errors stay in the existing banner and clear on the next submission.

- [x] Render Name, Contact number, Email, Password and Confirm password in the existing grid. Use `type="tel"`/`autocomplete="tel"`, `autocomplete="name"`, `autocomplete="email"`, and `autocomplete="new-password"` on both password fields. Add unique input/error IDs, associated labels, `aria-invalid`, and conditional `aria-describedby` like the Login page.
- [x] Show confirmation-required or `Passwords do not match.` beside confirmation after it is touched. The group mismatch must also set confirmation's accessibility/error styling even though its control is otherwise valid. Show field `server` errors beside their controls.
- [x] Retain the existing spinner and disabled submit/Cancel states; bind form `aria-busy`. Make inputs read-only while submitting so a response cannot attach an error to newly edited values. Use a real `Back to Login` RouterLink; route departure is safe because the subscription is cancelled.
- [x] Use public-facing copy: `Create account`, `Create your customer account.`, `Creating account...`. Keep the existing card, spacing, colors and responsive grid; add only CSS required by new states. No new UI abstraction or redesign.
- [x] Extend the existing registration specs for mismatched passwords (including changing the original password), backend field limits, required whitespace, exact request mapping, a second submit while the request is pending, values preserved after 400/409/network errors, correction/retry, and cancellation on destroy. Assert observable behavior rather than duplicating validators in tests.

## Task 3: Route to registration and display the successful outcome

**Files:** URL constants, auth routes, existing login container/page files and specs, and the new route spec.

- [x] Set `PAGE_PATHS.register` to `'register'`. Add this entry to `authRoutes`, retaining the existing canonical lazy-loaded entry:

```ts
{ path: 'users/register', redirectTo: PAGE_PATHS.register, pathMatch: 'full' },
```

Keep both URLs public. Do not add a second page or modify `app.routes.ts`. Check the Login link and legacy user-list action now navigate to `/register`; preserve the older bookmarked URL through the redirect.

- [x] On HTTP 201, replace the current registration success navigation with:

```ts
void this.router.navigate([LOGIN_URL], { queryParams: { registered: '1' } });
```

Only a UI marker is passed. Do not call `acceptLogin`, store the response, create a token, or put customer details in the URL. Existing valid sessions retain their existing login redirect behavior; this work does not sign out an already signed-in user.

- [x] In `LoginUserList`, import `ActivatedRoute`, read the marker, and expose the fixed message:

```ts
readonly registrationMessage = inject(ActivatedRoute).snapshot.queryParamMap.get('registered') === '1'
  ? 'Account created successfully. Sign in with your email and password.'
  : '';
```

Pass `[successMessage]="registrationMessage"` through the existing container template. In `LoginUserPage`, add `readonly successMessage = input('');` and render:

```html
@if (successMessage()) {
  <p class="success-message" role="status">{{ successMessage() }}</p>
}
```

Style this with the existing spacing and a restrained success color. Keep the existing error banner separate. The marker may remain visible after refresh; it is presentation only, never proof of account creation or authentication. Do not add a flash-message service or persist sensitive form data.

- [x] Update the existing Login link expectation from `/users/register` to `/register`; test success text present for the marker and absent for ordinary Login. Use real HTTP testing for the registration success case and assert navigation plus absence of a stored auth token.
- [x] Add a focused RouterTestingHarness spec using the actual auth route configuration and HttpClient providers: a signed-out visit to `/register` renders the registration page, and `/users/register` ends at `/register` with the same page. No registration HTTP call should occur merely from visiting either URL.

## Task 4: Verify acceptance and prepare the implementation for review

**Working directory:** `E:/sportify/28_8_2026/sportify-stage-fe`.

- [x] Before implementation, run the focused auth/core checks once and record any existing failures; do not infer today's baseline from older dashboard documentation.
- [x] After implementation, run:

```powershell
npm test -- --watch=false --include='src/app/shared/feature/auth/**/*.spec.ts' --include='src/app/core/**/*.spec.ts'
npm run build
git diff --check
```

Expected: relevant tests pass, production build succeeds, and no whitespace errors. Report pre-existing warnings separately. Do not add dependencies, relax budgets, or fix unrelated legacy tests to complete registration.

- [x] In the browser at desktop and 390px width, check tab order, labels, visible keyboard focus, all five fields, matching/mismatched passwords, field errors, double-click/Enter submission, pending state, failures and retry, Login/back navigation, the old URL redirect, and success announcement. Ensure the form does not overflow horizontally.
- [x] Against an isolated development/test API using synthetic accounts, verify valid registration returns 201, duplicate email/contact return 409 without losing entered fields, and the new account can sign in through the existing Login page. Confirm only USER is assigned. Do not create accounts in the application database just to run the check.
- [x] Against that same safe test environment, submit valid anonymous request bodies with verified ADMIN/FINANCE/SUPERVISOR IDs and an unknown positive ID. Expect 403 and no account/role insertion. Nonpositive IDs should receive validation failure. These direct API checks establish the security acceptance criterion; a mocked frontend test cannot.
- [x] Review the diff against `AGENTS.md` and the acceptance table below. Record commands, results and any deployment prerequisite when presenting the completed implementation. Implementation commits should contain only files belonging to this issue.

## Acceptance coverage

| Issue #3 requirement | Implementation / verification |
| --- | --- |
| Valid registration followed by sign-in | Correct API models/body; Tasks 2–3 success flow; isolated end-to-end check. |
| Duplicates and validation preserve other input | Field `server` errors, banner fallbacks, no form reset; Task 2 tests. |
| Local-only confirmation | Group validator and explicit payload/service construction; exact-body assertion. |
| No duplicate submissions | Existing state guard plus disabled pending controls; delayed-response test. |
| Anonymous requests cannot choose privilege | Existing backend USER guard; verified numeric mapping and direct API denial checks before release. |
| No unsupported account flows | Only Create account and Login are presented. |
| Current frontend structure and accessible presentation | Existing shared auth containers/components/service/models and CSS; component and browser checks. |

## Review status

Implemented and reviewed. The verified development USER mapping is `1`. The backend guard was exercised against an isolated instance of the current backend build; production deployment has not been checked or changed.

## Implementation verification — 2026-09-13

- Branch: `feat/issue-3-shared-register`, based on frontend commit `42c750d`.
- Baseline: 30 auth/core tests passed before implementation. Final focused suite: 57 tests passed across 8 files, including exact registration payload, local confirmation, pending guard, 400/409/403/network errors, value preservation, retry, cancellation, Login success message and both registration URLs.
- `npm run build` succeeded. The existing login/register stylesheet warning budgets remain exceeded; no budget thresholds or dependencies were changed.
- `git diff --check` passed.
- Headless Edge browser checks at 1440px and 390px passed: field validation, confirmation, duplicate email/contact, network retry, pending/readonly states, duplicate submission, success marker, no stored token, Login/back links, legacy redirect, keyboard focus and tab order. No page exceptions or horizontal overflow. Screenshots were visually inspected. These browser checks used mocked HTTP responses and synthetic input.
- Separately, current backend commit `4623dc9` passed 99 fresh HTTP assertions against a disposable PostgreSQL 18 database. Relevant checks: anonymous USER registration returned 201 with exactly one active USER role; the new account successfully signed in; duplicate email/contact returned 409 without insertion; invalid input returned 400; ADMIN, FINANCE, SUPERVISOR and unknown positive role requests returned 403 without insertion. The backend build succeeded with 0 errors and 3 existing warnings.
- Isolated API/PostgreSQL helpers were stopped. Backend application source and application data were not changed. Browser evidence lives locally under `E:/sportify/28_8_2026/build-artifacts/issue-3-*`; API evidence is recorded in `E:/sportify/28_8_2026/issue-3-api-verification.md`.
- Final independent review found no actionable implementation defects. Its route-assertion and stale-plan-documentation findings were addressed.
- Release limitation: deploy the verified USER-only backend enforcement and confirm the target environment's USER mapping before publishing this frontend. No deployment, push, merge or issue closure was performed.

## Owner review adjustments — 2026-09-13

- Error selection and message construction belong in the smart registration container. The page now receives `fieldErrors` and only renders messages and their accessibility attributes. Container-derived errors react to group and individual control events, including blur after another field was already touched.
- Removed the explicit frontend name maximum of 150 and email maximum of 255 as requested. Required/blank checks, email format validation and contact/password rules remain. Backend limits and returned validation messages remain authoritative.
- Kept the existing registration-success handoff to Login, as required by issue #3. Its page accepts a message from the Login container and does not decide registration state.
- Public registration still sends the verified development USER role ID 1. This is not a general account-role default; other account roles and staff provisioning are outside this public endpoint.
- Follow-up verification: 59 auth/core tests passed, desktop/mobile browser checks passed, production build succeeded with the existing stylesheet warnings, and independent review found no actionable defects.
