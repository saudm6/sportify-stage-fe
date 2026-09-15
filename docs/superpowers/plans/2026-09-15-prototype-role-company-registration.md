# Prototype Role and Company Registration Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task by task. Checkboxes track execution. The owner approved the prototype scope below. Implementation and runtime verification are complete; the execution record follows the tasks.

**Goal:** Anyone can create an account as USER, ADMIN, FINANCE, or SUPERVISOR by choosing a role; staff roles require an existing company and their data access and permissions apply only inside that company.

**Architecture:** Extend the existing public registration endpoint and shared auth form. Roles gain public UUIDs; one anonymous options endpoint supplies role and company dropdown values. The registration service resolves the supplied IDs, validates the role/company combination, and saves the account, selected company, and one active role in one unit of work. Resolve current company and active permissions from the database for protected operations, and restrict every company-owned read/write to that company.

**Tech Stack:** Existing Angular 21, reactive forms, RxAngular/RxJS, Vitest, .NET 10, FluentValidation, EF Core, PostgreSQL, and Flyway. Native HTML selects; no new dependencies.

## Approved scope and defaults

- Anyone may create any of the four supported roles. No ADMIN-only restriction, invitation, approval, environment gate, or temporary-password flow is part of this prototype.
- ADMIN, FINANCE, and SUPERVISOR require an existing company. USER does not have a company selection.
- **Owner correction:** Company isolation is required now. A Company A account cannot read/change Company B's protected data or exercise ADMIN/FINANCE/SUPERVISOR permissions in Company B. Keep existing feature checks and add company checks; one never substitutes for the other.
- Use one selected role and at most one company per newly created account. Keep the existing multiple-role database relationship for other operations.
- Existing accounts retain their current roles and nullable company association; do not invent a company for them. Existing staff accounts without a company receive 403 on company-protected operations until explicitly assigned a company. They never receive global access as a fallback.
- Registration creates new accounts. Existing user read/edit and role-toggle paths must also enforce company isolation. No company-creation or company-switching UI is added.
- Preserve name/contact/email/password rules, confirmation, duplicate protection, input preservation on errors, no automatic login, direct `/login` navigation, and shared notBlank validation.
- The frontend gets public IDs from the current API. Do not hardcode UUIDs or numeric IDs and do not use a TypeScript enum as the source of database values. Stable role names remain useful for navigation and backend rules.
- Follow-up: [backend #7 — Replace prototype staff self-registration before normal use](https://github.com/saudm6/sportify-stage-be/issues/7). Replacing unrestricted signup is deferred; company isolation is part of this plan and is not deferred. The issue links to existing staff onboarding #4.
- The prototype still permits choosing any existing company at signup. Isolation is per account: an A account cannot switch to B through a request, but unrestricted signup can create a separate B account. Verifying who may join a company belongs to the deferred onboarding replacement in #7.
- Role-feature definitions remain shared templates. A staff account's active role grants those features only within its assigned company; ADMIN is a company administrator here, with no implicit global-administrator exception. Per-company customization of role templates is not required.

## Repository constraints and starting state

- Frontend root: `E:/sportify/28_8_2026/sportify-stage-fe`, branch `feat/issue-3-shared-register`; existing direct-login/notBlank changes are uncommitted. Preserve them and all unrelated untracked files.
- Backend root: `E:/sportify/28_8_2026/sportify-stage-be`, inspected branch `feat/staff-feature-authorization` at `4623dc9`. Recheck branch/status before execution and keep this change reviewable separately from unrelated work.
- The owner's explicit prototype decision supersedes the backend AGENTS.md sentence limiting public registration to USER and earlier plan decisions that rejected staff-role registration. Update those statements during implementation rather than treating them as an approval blocker.
- Continue following backend layers: endpoints send commands/queries, handlers delegate, services own rules, repositories own persistence, and Flyway owns schema changes.
- Backend AGENTS.md says not to add tests or testing infrastructure. Use a solution build and relevant manual HTTP/database checks. Extend existing frontend tests.
- Use an isolated disposable database and synthetic accounts for verification. This plan does not direct a migration against the application database or authorize deployment.

## Contracts

### GET /api/account/registration-options — anonymous

```typescript
interface RegistrationOptions {
  roles: { publicId: string; name: string; requiresCompany: boolean }[];
  companies: { publicId: string; nameEn: string; nameAr: string }[];
}
```

Return only the four supported roles that exist in the database, and existing companies. Return names and public IDs only. A missing role is not invented. Use readable labels and a deterministic order. requiresCompany is supplied by the backend so UI visibility does not depend on guessing IDs.

### POST /api/account/register — anonymous

```typescript
interface RegisterUserRequest {
  contactNumber: string;
  name: string;
  email: string;
  password: string;
  rolePublicId: string;
  companyPublicId: string | null;
}
```

| Input | Result |
| --- | --- |
| Valid USER role; companyPublicId null/omitted | 201; USER account with no company |
| Valid ADMIN/FINANCE/SUPERVISOR role and existing company UUID | 201; account linked to that company and selected role |
| Missing/empty/malformed/unknown/unsupported role | 400; no account |
| Staff role with missing/empty/malformed/unknown company | 400; no account |
| USER with a non-null companyPublicId | 400; no account; frontend clears it when switching to USER |
| Duplicate email/contact | Existing 409 behavior; no partial account |

Keep the existing registration response shape, including role names/IDs. Persist company association without expanding unrelated user-response contracts solely for this form. Confirmation stays local. An old request containing only numeric roleId fails the required rolePublicId validation; no numeric fallback is added.

## Task 1: Add public role IDs and the account-company association

**Files (backend root):**

- Create `database/migrations/V9__prototype_registration_role_public_ids_and_user_company.sql` after confirming V9 is still unused in the migration source at execution time.
- Modify `Test.Domain/Entities/BookingSystem/Role.cs`, `User.cs`.
- Modify `Test.Infrastructure/Configurations/BookingSystem/RoleConfiguration.cs`, `BookingUserConfiguration.cs`.

- [x] Add the Flyway migration. Keep existing numeric keys and role assignments unchanged:

```sql
ALTER TABLE booking_system.roles
    ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX ux_roles_public_id
    ON booking_system.roles(public_id);

ALTER TABLE booking_system.users
    ADD COLUMN company_id bigint NULL,
    ADD CONSTRAINT users_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES booking_system.company(id)
        ON DELETE RESTRICT;
CREATE INDEX ix_users_company_id
    ON booking_system.users(company_id);
```

- [x] Add `public Guid PublicId { get; set; }` to Role. Add `public long? CompanyId { get; set; }` and `public Company? Company { get; set; }` to User. Do not add a new membership table for this one-company prototype.
- [x] Add mappings, following the existing Company.PublicId mapping:

```csharp
builder.Property(role => role.PublicId).HasColumnName("public_id")
    .HasDefaultValueSql("gen_random_uuid()").IsRequired();
builder.HasIndex(role => role.PublicId).IsUnique()
    .HasDatabaseName("ux_roles_public_id");
```

```csharp
builder.Property(user => user.CompanyId).HasColumnName("company_id");
builder.HasIndex(user => user.CompanyId).HasDatabaseName("ix_users_company_id");
builder.HasOne(user => user.Company).WithMany()
    .HasForeignKey(user => user.CompanyId).OnDelete(DeleteBehavior.Restrict);
// ponytail: one company per account for the prototype; use company memberships if multi-company staff is needed. Follow-up: saudm6/sportify-stage-be#7.
```

- [x] Apply the migration to the isolated database. Verify each existing role has a distinct non-null UUID, role numeric IDs/assignments remain unchanged, existing users have null company_id, and invalid company references are rejected.

```sql
SELECT id, role_name, public_id FROM booking_system.roles ORDER BY id;
SELECT count(*) AS roles, count(DISTINCT public_id) AS public_ids
FROM booking_system.roles;
```

- [x] Run `dotnet build test.slnx --no-restore --verbosity quiet` from the backend root and review the migration/mapping diff.

## Task 2: Implement role/company selection in the backend

**Files (backend root):**

- Modify `Test.Application/Dto/BookingSystem/Accounts/RegisterAccountRequest.cs`.
- Create `Test.Application/Dto/BookingSystem/Accounts/RegistrationOptionsResponse.cs` with the response and its endpoint-specific role/company records.
- Modify `Test.Application/Endpoint/AccountEndpoints.cs`.
- Modify `Test.Application/UserCases/Accounts/Commands/RegisterAccount/RegisterAccountCommand.cs` and `RegisterAccountCommandHandler.cs`.
- Create `Test.Application/UserCases/Accounts/Queries/GetRegistrationOptions/GetRegistrationOptionsQuery.cs` and `GetRegistrationOptionsQueryHandler.cs`, following the existing GetCurrentPermissions query/handler pattern.
- Modify `Test.Application/Service/AccountService.cs`, `IAccountService.cs`.
- Modify `Test.Infrastructure/Persistence/Repository/BookingUserRepository.cs`, `IBookingUserRepository.cs`.

- [x] Change the registration request and command to four existing strings plus `Guid RolePublicId` and `Guid? CompanyPublicId`. Pass both through endpoint, handler, and service. Remove the numeric request RoleId and its validator. The service signature becomes:

```csharp
Task<User> RegisterAsync(User user, string password, Guid rolePublicId,
    Guid? companyPublicId, CancellationToken cancellationToken);
```

- [x] Keep existing command field validators. Require RolePublicId and reject explicitly supplied Guid.Empty for CompanyPublicId:

```csharp
RuleFor(command => command.RolePublicId).NotEmpty();
RuleFor(command => command.CompanyPublicId).NotEmpty()
    .When(command => command.CompanyPublicId.HasValue);
```

The service determines whether company is required after resolving the actual role. Malformed UUID JSON fails request binding before insertion.

- [x] Add these repository methods beside existing lookups. Preserve GetRoleByIdAsync because staff role toggling uses it:

```csharp
public Task<Role?> GetRoleByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
    context.Roles.SingleOrDefaultAsync(role => role.PublicId == publicId, cancellationToken);

public Task<Company?> GetCompanyByPublicIdAsync(Guid publicId, CancellationToken cancellationToken) =>
    context.Companies.SingleOrDefaultAsync(company => company.PublicId == publicId, cancellationToken);

public async Task<(IReadOnlyList<Role> Roles, IReadOnlyList<Company> Companies)>
    GetRegistrationOptionsAsync(CancellationToken cancellationToken) =>
    (await context.Roles.AsNoTracking().OrderBy(role => role.RoleName).ToListAsync(cancellationToken),
     await context.Companies.AsNoTracking().OrderBy(company => company.CompanyNameEn).ToListAsync(cancellationToken));
```

Declare the matching signatures in IBookingUserRepository. Keep EF operations sequential on the shared DbContext.

- [x] Put the supported-role list in AccountService and use it for both options and registration validation:

```csharp
private static readonly string[] RegistrationRoleNames = ["USER", "ADMIN", "FINANCE", "SUPERVISOR"];
```

Replace the current numeric-role lookup/USER-only ForbiddenException block with this logic before hashing or insertion. Add FluentValidation and FluentValidation.Results imports:

```csharp
// ponytail: anonymous staff-role selection is temporary prototype behavior; replace through saudm6/sportify-stage-be#7.
var role = await repository.GetRoleByPublicIdAsync(rolePublicId, cancellationToken);
if (role is null || !RegistrationRoleNames.Contains(role.RoleName))
    throw new ValidationException([new ValidationFailure("RolePublicId", "Select a valid role.")]);

Company? company = null;
if (role.RoleName != "USER")
{
    if (companyPublicId is null || companyPublicId == Guid.Empty)
        throw new ValidationException([new ValidationFailure("CompanyPublicId", "Company is required for this role.")]);
    company = await repository.GetCompanyByPublicIdAsync(companyPublicId.Value, cancellationToken);
    if (company is null)
        throw new ValidationException([new ValidationFailure("CompanyPublicId", "Select a valid company.")]);
}
else if (companyPublicId is not null)
{
    throw new ValidationException([new ValidationFailure("CompanyPublicId", "Company is not applicable to this role.")]);
}
user.CompanyId = company?.Id;
user.Company = company;
```

Retain normalization, duplicate checks, password hashing, one active UserRole with the resolved role.Id, repository.AddAsync, and one SaveChangesAsync. The database transaction for that save must commit account and role together. Task 4 applies the persisted company to protected operations.

- [x] Define RegistrationOptionsResponse with Roles and Companies collections and map repository results in AccountService. Filter roles with RegistrationRoleNames; set requiresCompany from `role.RoleName != "USER"`. Map companies to PublicId, CompanyNameEn, and CompanyNameAr only. Query handler delegates to the service; the endpoint sends the query:

```csharp
group.MapGet("/registration-options", async (ISender sender, CancellationToken cancellationToken) =>
    Results.Ok(await sender.Send(new GetRegistrationOptionsQuery(), cancellationToken)))
    .AllowAnonymous();
```

- [x] Update registration HTTP metadata from the former role-denial 403 to validation 400 as appropriate. Preserve the login endpoint. Task 4 extends permissions with company context. Build and manually verify the contract matrix in Task 6.

## Task 3: Add role/company dropdowns to the existing registration form

**Files (frontend root):**

- Modify `src/app/core/urls.ts`.
- Modify `src/app/shared/feature/auth/models/register-user-request.ts`.
- Create `src/app/shared/feature/auth/models/registration-options.ts` using the interface above.
- Modify `src/app/shared/feature/auth/service/auth-api.service.ts`.
- Modify `src/app/shared/feature/auth/auth.routes.spec.ts` for the registration-options request on navigation.
- Modify `src/app/shared/feature/auth/containers/register-user-list/register-user-list.ts`, `.html`, `.spec.ts`.
- Modify `src/app/shared/feature/auth/components/register-user-page/register-user-page.ts`, `.html`, `.css`, `.spec.ts`.

- [x] Add the following entry to AUTH_API_URLS:

```typescript
registrationOptions: `${API_BASE_URL}/account/registration-options`,
```

Add the service GET method and replace customerRoleId/Omit with the new RegisterUserRequest type. Explicitly construct the six-field POST body:

```typescript
getRegistrationOptions(): Observable<RegistrationOptions> {
  return this.httpClient.get<RegistrationOptions>(AUTH_API_URLS.registrationOptions);
}

registerUser(request: RegisterUserRequest): Observable<RegistrationResponse> {
  const { contactNumber, name, email, password, rolePublicId, companyPublicId } = request;
  return this.httpClient.post<RegistrationResponse>(AUTH_API_URLS.register, {
    contactNumber, name, email, password, rolePublicId, companyPublicId,
  });
}
```

- [x] Load options once when the container initializes using the existing subscription/state pattern and takeUntilDestroyed. Track loading, options, and load failure in container state. Disable submission until options load; display a retry action on failure. Keep entered account fields when retrying. Do not silently substitute hardcoded roles or IDs.
- [x] Add rolePublicId (required, initial empty selection) and nullable companyPublicId controls. Resolve the chosen role from loaded options; require company only when requiresCompany is true. Clear company and its validators/errors on switching to USER; call updateValueAndValidity after changing validators. Backend validation remains authoritative.

```typescript
rolePublicId: ['', Validators.required],
companyPublicId: this.formBuilder.control<string | null>(null),
```

- [x] Extend the exact registration payload test to assert rolePublicId and companyPublicId instead of roleId. Use UUID fixtures returned by the options GET. Flush options in existing container and route tests before submitting; update form fixtures to include the new controls. Watch the new expectation fail before changing the implementation.
- [x] Extend the container-to-page inputs with role/company options, requiresCompany, and option-loading/retry state. The page only renders inputs and emits actions. Add native selects with associated labels, empty placeholder options, field-error IDs, aria-invalid/aria-describedby, and disabled state while loading/submitting. Show Company only for staff roles, and submit null for USER.
- [x] Extend fieldErrors and the explicit API field-error map with RolePublicId → rolePublicId and CompanyPublicId → companyPublicId. Preserve values on 400/409/network errors, pending-submit guard, and direct `/login` navigation after 201.
- [x] Reuse the existing input styling for select elements and existing pending/error UI; do not add a picker library or redesign. Update public copy to `Create your account.` because the form now creates staff and customer accounts.
- [x] Extend existing frontend checks for required role, staff company requirement, switching back to USER, options retry, exact payload, preserved inputs, and accessible dropdowns. Run focused auth tests.

## Task 4: Enforce company data and permission isolation in the backend

**Files (backend root):**

- Modify `Test.Application/Service/AccessService.cs`.
- Modify `Test.Infrastructure/Persistence/Repository/IBookingUserRepository.cs` and `BookingUserRepository.cs`.
- Modify `Test.Application/Dto/BookingSystem/Authentication/CurrentPermissionsResponse.cs`.
- Modify `Test.Application/Service/CourtService.cs`, `BookingReportService.cs`, and `BookingUserService.cs`.
- Review `Test.Application/Endpoint/UsersEndpoint.cs`, `CourtEndpoints.cs`, `StaffReportEndpoints.cs`, and `Test.Web/Program.cs` to verify every exposed company-data path uses the changed services.

- [x] Extend the repository's active-access projection with the user's nullable CompanyId and Company's nullable PublicId, alongside active roles/features. Preserve active-role filtering and distinct role/feature values. Return the company and grants from the same database read, not from caller-provided company IDs or token role/company claims. A private record in AccessService can carry this context; do not introduce a new authorization framework.
- [x] Extend CurrentPermissionsResponse with nullable `CompanyPublicId`. Return it with the current account's roles/features, and document that these grants apply to this company only. USER-only accounts may retain their existing customer features without a company. A staff-role account with no assigned company must receive 403 for company permissions rather than a global grant. Keep internal numeric CompanyId out of the HTTP response.
- [x] Make the existing company-operation authorization methods return the verified internal company ID:

```csharp
public Task<long> RequireFeatureAsync(string feature, CancellationToken cancellationToken);
public Task<long> RequireAdminAsync(CancellationToken cancellationToken);
```

Each implementation loads current access, requires authentication and active access, requires a non-null company, and checks the requested feature or ADMIN role before returning that company. GetCurrentAsync and these checks share the private context loader so grant and company decisions cannot accidentally use different lookup paths. No missing-company fallback, request-selected company override, or unvalidated JWT scope is allowed.

- [x] Update all four CourtService methods to capture the company and scope database queries before materialization or mutation:

```csharp
var companyId = await accessService.RequireFeatureAsync(FeatureCodes.PricingManage, cancellationToken);
```

For creation, resolve `branchPublicId` using both `branch.PublicId == branchPublicId` and `branch.CompanyId == companyId`. For single reads/updates, resolve the court using both `item.PublicId == publicId` and `item.Branch.CompanyId == companyId`. For lists, start with:

```csharp
var query = context.Courts.AsNoTracking()
    .Where(court => court.Branch.CompanyId == companyId);
```

Then apply existing optional filters. Scope returned branch options with `branch.CompanyId == companyId`. Global sports categories can remain shared reference data. A foreign court/branch UUID behaves like an unavailable resource (404); it must never be loaded for updates. A foreign optional filter returns no matching rows, not Company B rows.

- [x] Scope BookingReportService before grouping, counts, pagination, or totals. Pass companyId into both BuildCustomerRows and BuildExternalRows and filter their source queries:

```csharp
// Customer orders: also guard joined transaction/court ownership against inconsistent records.
.Where(order => order.CompanyId == companyId
    && order.Court.Branch.CompanyId == companyId
    && order.Transaction.CompanyId == companyId)
```

```csharp
// External bookings are owned through court -> branch -> company.
.Where(booking => booking.Court.Branch.CompanyId == companyId)
```

Keep date/status filters. Scope report branch options to the current company. This must cover customer details, entries, revenue/booking totals, breakdowns, pagination totals, and filter options; filtering only the final entries array is insufficient.

- [x] Protect BookingUserService's currently unrestricted authenticated read/edit methods. Allow a user to read/edit their own profile. For another account, require a current ADMIN and restrict the target to the same non-null company before returning profile data or saving changes. Do not let a company ADMIN manage another company's staff or global USER accounts with null CompanyId through these staff-management paths. Keep customer details embedded in authorized own-company booking reports available as part of those reports.
- [x] In ToggleRoleAsync, capture `companyId` from RequireAdminAsync and retrieve the target using `user.PublicId == publicId && user.CompanyId == companyId` before loading/toggling the assignment. Scope the assignment's user/company predicate too. Keep GetRoleByIdAsync for selecting the target's existing assignment. A role ID is not authority to operate on another company's user. Cross-company and unknown target accounts receive the same 404; denied non-admin callers receive 403.
- [x] Add scoped repository lookup parameters for management calls rather than filtering a returned list in the frontend. CompanyId must not be added to UpdateUserDataRequest; neither that endpoint nor a JWT/header/query parameter can move an account between companies. Other role feature checks remain in force, so company membership alone never grants ADMIN or other unavailable permissions.
- [x] Audit the endpoints actually mapped in Program.cs. The inspected build exposes account, booking users, courts, and staff reports; old product/order endpoint files are not currently mapped. Confirm this at execution time and cover any newly mapped company-data routes before declaring isolation complete.
- [x] Verify with two synthetic companies and current database roles: matching-role accounts can perform permitted own-company actions, while foreign IDs return no data and cannot mutate records. Revoke an active role or change the stored company in the isolated database and verify the old token cannot retain the previous database authority. Do not add company claims as the sole enforcement mechanism.

## Task 5: Make all selected roles usable after login

**Files (frontend root):** `src/app/core/auth.service.ts`, `auth.service.spec.ts`, `role.guard.spec.ts`, `src/app/feature/staff/staff.routes.ts`.

- [x] Extend the supported roles to ADMIN, USER, FINANCE, SUPERVISOR. Route any staff role to the existing `/staff/dashboard`; USER-only sessions retain `/product`. Permit all three staff roles on the staff route:

```typescript
const supportedRoles = ['ADMIN', 'USER', 'FINANCE', 'SUPERVISOR'];
```

```typescript
const staffRoles = ['ADMIN', 'FINANCE', 'SUPERVISOR'];
return this.router.createUrlTree(this.session()?.roles.some(role => staffRoles.includes(role))
  ? ['/', PAGE_PATHS.staff, PAGE_PATHS.dashboard]
  : [`/${PAGE_PATHS.products}`]);
```

```typescript
data: { allowedRoles: ['ADMIN', 'FINANCE', 'SUPERVISOR'] },
```

- [x] Extend existing session/guard checks for FINANCE and SUPERVISOR login, restored sessions, and dashboard routing. Continue rejecting unsupported/malformed/expired tokens and USER-only access to staff routes. Existing backend feature checks remain authoritative; do not auto-grant extra database features to make a page pass.

## Task 6: Verify, document, and prepare the paired change

- [x] Run backend solution build and manual HTTP checks on the isolated migrated database. Use actual role/company UUIDs returned by registration-options. Exercise all four roles, missing/unknown/empty UUIDs, mismatched company selection, duplicates, old numeric-only payloads, and a new-account login for each role. Compare user/role counts before and after failures; confirm staff company_id is persisted and USER company_id is null.
- [x] Verify options contain only supported role public IDs and company display data. Use a fixture where USER's numeric ID is not 1 to demonstrate that no frontend numeric mapping remains.
- [x] Verify API creation remains anonymous for all four roles and does not require an ADMIN token or environment flag. Verify that each created staff account is company-scoped on every protected operation.
- [x] Seed Companies A and B with distinct branches, courts, customers/bookings, totals, and staff. Verify A staff cannot read/edit B courts, create a court in B, obtain B report entries/totals/branch options, read/edit B staff profiles, or toggle B staff roles. Repeat with B against A and with matching role names in both companies. Assert failed writes leave B rows unchanged. Verify ADMIN is not a cross-company bypass and staff with null CompanyId are denied. Direct API requests are required; hidden frontend controls are not evidence.
- [x] Inspect `/api/account/permissions` for each account: companyPublicId is its current database company, and permissions grant no authority over the other company. Keep USER-only self-profile access and own-company report customer data working.
- [x] Run frontend checks and build:

```powershell
npm test -- --watch=false --include='src/app/shared/feature/auth/**/*.spec.ts' --include='src/app/core/**/*.spec.ts'
npm run build
git diff --check
```

- [x] In the browser, verify role selection, conditional Company, loading/retry, disabled pending selects, field errors, keyboard selection, mobile layout, and registration → plain Login → role destination. Confirm no UUID is hardcoded and password/confirmation are not placed in URLs or storage.
- [x] Update backend AGENTS.md's scope to describe prototype self-registration, required staff company isolation, company-scoped ADMIN/feature checks, and deferred onboarding #7. Preserve other rules, including no backend test infrastructure. Mark contradictory historical plan requirements superseded instead of claiming their old verification covers this flow.
- [x] Review and commit changes by repository, selectively preserving earlier uncommitted work. Record fresh verification results here; no push/merge/deploy is implied. For an eventual rollout, apply the schema migration first, then release the matching API and frontend; older browser bundles need reloading because numeric roleId is no longer accepted.

## Deferred work

[Backend issue #7](https://github.com/saudm6/sportify-stage-be/issues/7) tracks replacing anonymous staff self-registration, verifying who may join a company, reviewing prototype-created accounts, and connecting the eventual flow to existing staff-onboarding #4. Company data and permission isolation are required in this plan now; they are not deferred.

## Plan review

- [x] Owner's prototype self-registration and corrected company-isolation requirement are explicit.
- [x] Reports, totals, court mutations/lookups, profile access, role toggles, and permission context are included in company isolation.
- [x] Required role/company validation and atomic account creation are retained.
- [x] Existing Company.PublicId is reused; role UUIDs are API-loaded, not enums or compiled constants.
- [x] Existing GetRoleByIdAsync staff caller is preserved.
- [x] Login/routing gaps for FINANCE and SUPERVISOR are included.
- [x] Backend #7 created for the later replacement.
- [x] Implementation and runtime verification are complete.

## Execution record — 2026-09-15

- Implemented Tasks 1–6 on frontend `feat/issue-3-shared-register` and backend `feat/prototype-role-company-registration` (based on `4623dc9`). Preserved the prior direct-login and shared `notBlank` changes.
- Reused native selects, reactive form validators, existing service/repository layers, and single-save persistence. No new dependencies or backend test infrastructure.
- Minor implementation adjustments: existing profile lookup methods take an optional company scope instead of new overloads; only an exact authenticated self lookup omits that scope. Malformed UUID HTTP checks exposed an existing exception-handler issue, so BadHttpRequestException now retains its HTTP status instead of becoming 500.
- Backend solution build passed. Fresh disposable database verification passed 99 HTTP checks plus migration/persistence assertions, including USER numeric ID 42, all four roles, invalid/duplicate inputs, two-company reads and writes, totals, role revocation, database company changes, and forged role/company claims.
- Frontend focused auth/core tests passed: 65 tests. Production build passed. Existing Login/Register stylesheet budget warnings remain; backend retains existing NU1510 warnings and the full build's existing OrderLineItemService CS8603 warning.
- Browser checks passed at 1440px and 390px for dropdowns, keyboard use, loading/retry, pending state, field errors, exact anonymous payload, and plain `/login` navigation. Browser responses were mocked; actual API/database behavior was verified separately. Login role destinations were covered by auth/guard tests.
- Independent frontend/backend review found no actionable issues. Detailed backend evidence: `E:/sportify/28_8_2026/sportify-stage-be/docs/reviews/2026-09-15-prototype-company-registration.md`. Runnable local HTTP/browser checks and results remain under `E:/sportify/28_8_2026/build-artifacts`.
- Backend AGENTS.md and historical plans now identify the approved prototype scope. GitHub issue #7 tracks the deferred signup replacement.
- Application database migration and deployment were not performed. Apply V9 before releasing the paired API/frontend and reload old browser bundles. Existing staff need explicit company assignment; missing-company staff remain denied.