# How the frontends restore a session and handle request failures

Opening a saved CourseHub link should take you to that page. A slow server should show a loading state, an expired session should take you through sign-in, and a failed request should explain what can be retried. Those are different situations, and the application now treats them separately.

For example, opening `/profile?tab=courses#history` while signed out keeps the entire destination. After signing in, the browser returns to that pathname, query and section. If the session service is temporarily unavailable, the page stays at that address and offers **Try again**.

## One session query per application

Both applications use TanStack Query. The student provider starts the session query once for the application; the landing page and protected routes read the same result. Administrator routes share the administrator session query. Moving between administrator pages therefore does not start an independent authentication check for each route.

The student bootstrap is `GET /api/user`. It returns the authenticated student, capabilities and academic synchronization information. The administrator bootstrap is `GET /api/admin/`. The browser never creates permissions from a course dropdown, local storage or an editable BR flag. Controls still use the capabilities returned by the API, and every resource request still passes server authorization.

Session data is fresh for one minute. An active session query rechecks once a minute and revalidates when stale on focus or reconnect. An API response with status 401 ends the browser session immediately. The route gate hides protected content and saves its current pathname, query and hash in the sign-in destination.

A failed session check shows a retryable message, including when it was a background check. Protected content is not left usable while the session cannot be confirmed. A successful retry restores the page. A 403 or 404 from a resource request does not sign out a valid user.

## A common request contract

`packages/browser` contains browser-specific networking and session code.

The transport always sends cookies with `credentials: include` and identifies the intended session role. This matters when a browser has both student and administrator cookies. API destinations must stay inside the configured API origin and `/api/` path; a caller cannot use this transport to send session headers to an arbitrary provider URL.

Each application keeps its CSRF token in memory. A bootstrap response can supply that token. Otherwise, the first mutation obtains it from the role-specific CSRF endpoint. Concurrent mutations share that request. If the API explicitly rejects a token with `CSRF_INVALID`, the transport refreshes it and retries the request once. Network failures and ordinary 403/500 errors never automatically replay mutations.

FilePond retains its upload progress, timeout and cancellation behavior. Its native upload requests use the same role and CSRF header source and the same authentication/error handling. File bytes are not automatically resent after an ambiguous network failure; the upload operation still determines which files need retrying.

The transport accepts an AbortSignal. Navigation can cancel a read, and a cancelled mutation waiting for a CSRF token does not get submitted later. Cancelling one consumer does not cancel another consumer's shared token refresh.

## Errors are data, but never list items

HTTP failures become `ApiError` objects with a safe message, status, stable code, optional field errors and request ID. Callers read those fields directly. The transport's `json` method returns the parsed response body; its `request` method returns a checked Response for callers that need headers or streaming. Both go through the same network and error rules.

The administrator Courses page previously accepted an error object as if it were an array, then crashed while filtering it. It now validates the successful list response, shows a visible error on failure and offers **Try again**. A real empty array still renders the normal empty state.

A route boundary catches unexpected rendering failures and keeps a retry action available. Navigation resets the boundary for the new route. Retrying invalidates queries so a page can request fresh data. The UI does not show JavaScript stacks or raw HTML error pages.

## Sign-in and logout

Student login accepts only a local destination; administrator login additionally confines the destination to administrator pages. The server continues validating OAuth state, PKCE and redirect destinations independently. The browser validation is not a replacement for those checks.

Logout sends the authenticated, CSRF-protected POST first. A successful response, or an already-expired session, clears session data and user-scoped queries. A network or server failure keeps the user signed in and shows the existing logout error, so the interface does not claim that logout succeeded prematurely.

The cache behavior follows TanStack Query's [documented defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), with the explicit timings above, and its [cancellation contract](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).
