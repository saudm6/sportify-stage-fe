# 0382026Test2FE

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Shared pagination

Change `DEFAULT_PAGE_SIZE` in `src/app/shared/functions/pagination.ts` to set the
initial size for users, bookings, resets and dashboard links. Keep it between 1
and 10 while the users API has a 10-row limit. Bookings supports up to 100 rows.

Use `defaultPagination()` for initial state and
`updatePagination(current, { page })` or `updatePagination(current, { pageSize })`
for events. Size changes return page 1; invalid events return `null`.
`PAGE_SIZE_OPTIONS` supplies dropdown options, including the default; filter it
to the endpoint's maximum. Use `validPagination(query)` before fetching URL state.
Users maps the helper's `page` to its API's `pageNumber` and passes its limits to
`updatePagination(current, change, maxPage, maxPageSize)`.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
