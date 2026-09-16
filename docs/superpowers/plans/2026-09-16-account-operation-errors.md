# Account Operation-Owned Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Status:** Superseded by the user's subsequent request on 2026-09-16: log API failures to the console instead of displaying them. The implementation below is historical, not the current design.

**Current implementation:** Load/save error callbacks each log directly to console.error. API error state, unavailable state, server-field mapping and API error UI were removed. Local form validation, Retry, unsaved edits, request cleanup and existing authentication handling remain. Account container reduced from 180 to 108 lines. Updated behavior checks failed before implementation (13 failures), then all 23 account tests passed; development build passed.
**Goal:** Make each account request method handle its own errors without a shared boolean-switched error dispatcher.
**Architecture:** Put load failure decisions directly in the `load()` subscription and save failure decisions directly in the `save()` subscription. Delete `showError(error, saving)`. Preserve existing user-visible behavior and keep API transport in AccountApiService.
**Tech Stack:** Existing Angular 21, reactive forms, HttpClient, RxJS, TypeScript, Vitest.

## Global Constraints

- Scope is the account container and its existing spec only; no API, model, template, dependency, or shared error-service changes.
- Preserve all messages, request guards, request cleanup, payload validation, field error mapping, and failed-edit retention.
- Keep `acceptProfile()`, `restore()`, and `fieldError()`: response acceptance and validation message formatting are separate responsibilities from HTTP error routing.
- Keep the current 409 exact-message contract; changing the backend to structured error codes is separate work.
- No extra GET after PATCH: PATCH already returns the account profile.
- No new maximum-length parameter: limits already live in validators and Angular errors retain requiredLength.
- Implementation was explicitly approved by the user on 2026-09-16.

## Design decision

Recommended: inline operation-specific error callbacks. It puts failure handling beside the request that can fail. The tradeoff is duplication of three short access/missing-profile cases between the two operations.
Alternative: private `handleLoadError` and `handleSaveError` methods would remove the boolean argument and keep shorter request methods, but retain navigation between methods.
Retaining one dispatcher would minimize the diff but leave the user's readability concern unresolved.
Choose inline callbacks for this refactor. The repeated cases are a deliberate readability tradeoff, not a reason to introduce another abstraction.

## Task 1: Characterize behavior, then move error handling into each operation

**Files**
- Modify: `E:/sportify/28_8_2026/sportify-stage-fe/src/app/shared/feature/account/containers/account/account.ts`
- Test: `E:/sportify/28_8_2026/sportify-stage-fe/src/app/shared/feature/account/containers/account/account.spec.ts`

**Interfaces**
- Consumes: `AccountApiService.load(): Observable<AccountProfile | null>` and `save(request: UpdateAccountRequest): Observable<AccountProfile | null>`.
- Preserves: `load(): void`, `save(): void`, `cancel(): void`, the existing page inputs/outputs and profile/form state.
- Removes: `private showError(error: unknown, saving: boolean): void`.

- [x] Read the latest container and spec, checking for intervening changes before applying the replacements.
- [x] Add the following characterization tests inside the existing `describe('My Account', ...)` block, where `loaded()`, `profile`, and `url` already exist. Existing tests already cover save 400/409 mapping, malformed 400 bodies, save 401/403/404 restrictions, retry, null profiles, pending-request cleanup, failed edits, and Cancel.

```ts
  it.each([
    [400, 'Unable to load your account. Please try again.', false],
    [401, 'Your session has expired. Please sign in again.', true],
    [403, 'You do not have access to this profile.', true],
    [404, 'Your profile could not be found.', true],
    [409, 'Unable to load your account. Please try again.', false],
    [500, 'Unable to load your account. Please try again.', false],
  ] as const)('handles load status %s without applying save field errors', (status, message, unavailable) => {
    const fixture = TestBed.createComponent(Account);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({
      errors: { Name: ['Choose another name.'] },
      detail: 'A user with this email already exists.',
    }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(page.error()).toBe(message);
    expect(page.unavailable()).toBe(unavailable);
    expect(page.loading()).toBe(false);
    expect(page.profile()).toBeNull();
    expect(page.form.controls.name.hasError('server')).toBe(false);
    expect(page.form.controls.email.hasError('server')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.nativeElement.textContent.includes('Retry')).toBe(!unavailable);
    fixture.destroy();
  });

  it('keeps the save fallback alongside recognized errors in a mixed validation response', () => {
    const { page, http, fixture } = loaded();
    page.form.controls.name.setValue('Unsaved');
    page.save();
    http.expectOne(url).flush({
      errors: { Name: ['Choose another name.'], Unexpected: ['Unrecognized detail.'] },
    }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(page.error()).toBe('Unable to save your account. Please try again.');
    expect(page.form.controls.name.getError('server')).toBe('Choose another name.');
    expect(page.form.controls.name.value).toBe('Unsaved');
    expect(page.saving()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Choose another name.');
    expect(fixture.nativeElement.textContent).not.toContain('Unrecognized detail.');
    fixture.destroy();
  });
```

- [x] Run the account spec before refactoring. These are behavior-preservation tests and should pass before and after; no artificial failing assertion about private method names is needed.

Working directory: `E:/sportify/28_8_2026/sportify-stage-fe`

```powershell
npm test -- --watch=false --include=src/app/shared/feature/account/containers/account/account.spec.ts
```

Expected: all account tests pass. If a test fails, understand the baseline before changing behavior.

- [x] Replace `load()` with this complete method. Generic/network errors retain the load fallback. Only 401/403/404 disable editing; load errors never apply save-specific field messages.

```ts
  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.unavailable.set(false);
    this.api.load().pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: profile => this.acceptProfile(profile),
      error: (error: unknown) => {
        this.error.set('Unable to load your account. Please try again.');
        if (!(error instanceof HttpErrorResponse)) return;
        switch (error.status) {
          case 401:
            this.unavailable.set(true);
            this.error.set('Your session has expired. Please sign in again.');
            return;
          case 403:
            this.unavailable.set(true);
            this.error.set('You do not have access to this profile.');
            return;
          case 404:
            this.unavailable.set(true);
            this.error.set('Your profile could not be found.');
            return;
        }
      },
    });
  }
```

- [x] Replace `save()` with this complete method. The 400 payload checks and 409 mapping remain local to saving. Unknown errors retain the save fallback.

```ts
  save(): void {
    if (this.loading() || this.saving() || !this.profile() || this.unavailable()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const { name, contactNumber, email } = this.form.getRawValue();
    this.api.save({ name: name.trim(), contactNumber: contactNumber.trim(), email: email.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: profile => {
          this.acceptProfile(profile);
          if (profile) this.success.set('Account updated successfully.');
        },
        error: (error: unknown) => {
          this.error.set('Unable to save your account. Please try again.');
          if (!(error instanceof HttpErrorResponse)) return;
          switch (error.status) {
            case 401:
              this.unavailable.set(true);
              this.error.set('Your session has expired. Please sign in again.');
              return;
            case 403:
              this.unavailable.set(true);
              this.error.set('You do not have access to this profile.');
              return;
            case 404:
              this.unavailable.set(true);
              this.error.set('Your profile could not be found.');
              return;
          }
          if (error.status === 400) {
            const errors: unknown = error.error?.errors;
            const fields = new Map<string, keyof typeof this.form.controls>([
              ['Name', 'name'], ['Email', 'email'], ['ContactNumber', 'contactNumber'],
            ]);
            let applied = false;
            let unrecognized = false;
            if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
              for (const [key, messages] of Object.entries(errors)) {
                const field = fields.get(key);
                if (field && Array.isArray(messages) && messages.length
                  && messages.every(message => typeof message === 'string' && message.trim())) {
                  this.form.controls[field].setErrors({ server: messages.join(' ') });
                  this.form.controls[field].markAsTouched();
                  applied = true;
                } else unrecognized = true;
              }
            }
            if (applied && !unrecognized) this.error.set('');
          } else if (error.status === 409) {
            const detail: unknown = error.error?.detail;
            const field = detail === 'A user with this email already exists.' ? 'email'
              : detail === 'A user with this contact number already exists.' ? 'contactNumber' : null;
            if (field) {
              this.form.controls[field].setErrors({ server: detail });
              this.form.controls[field].markAsTouched();
              this.error.set('');
            } else this.error.set('An account with this email or contact number already exists.');
          }
        },
      });
  }
```

- [x] Delete the entire original `private showError(error: unknown, saving: boolean)` method. Leave `acceptProfile()`, `restore()`, and `fieldError()` unchanged.
- [x] Run the same account-spec command again. Expected: all existing and added tests pass.
- [x] Run the development build to check template and TypeScript compilation.

```powershell
npm run build -- --configuration development
```

Expected: exit code 0. Record any existing warnings separately from failures introduced by this refactor.

- [x] Inspect the final diff and confirm the removed dispatcher has no remaining call sites.

```powershell
git diff --check
git diff -- src/app/shared/feature/account/containers/account/account.ts src/app/shared/feature/account/containers/account/account.spec.ts
rg -n 'showError' src/app/shared/feature/account
```

Expected: diff check succeeds; ripgrep produces no matches (exit code 1 means no matches).

## Acceptance criteria

- A reader can follow `load()` and see all load-error decisions without passing an operation flag.
- A reader can follow `save()` and see all save-error decisions without passing an operation flag.
- 401/403/404 still show the existing messages and block saves in both paths.
- Other load errors still allow Retry when no profile is available.
- Recognized 400/409 save errors still appear beneath the correct fields; malformed and mixed responses preserve fallback behavior.
- Failed saves retain entered values; successful saves retain the server response as the Cancel baseline.
- Loading/saving flags still clear on completion, failure, or destruction.
- No production behavior changes, new error framework, extra network calls, or unrelated refactors.


## Verification results — 2026-09-16

- Account spec: 27 tests passed before the refactor and 27 passed afterward.
- Development build: passed (exit code 0).
- Diff whitespace check: passed; no showError references remain in the account feature.
- Independent read-only review: no actionable findings.
- Changes remain uncommitted on feat/issue-2-my-account.
