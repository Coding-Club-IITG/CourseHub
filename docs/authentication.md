# Authentication and sessions

The API owns both student and administrator sessions. Student sign-in uses Microsoft's authorization-code flow with a browser-bound, single-use state and an S256 PKCE verifier. Administrator sign-in uses the explicitly provisioned account credentials.

Sessions last 24 days for students and 7 days for administrators. Each signed token identifies a MongoDB session record. The API checks expiry and revocation on every request and still checks that the account exists. Logout revokes the current session before clearing its cookie. Other devices keep their own sessions.

When introducing these sessions, previously issued tokens require a fresh sign-in because they do not have a persisted session record.

## Configuration

Configure the variables in `server/.env.example`:

- `NODE_ENV=production` enables Secure cookies. Serve the API over HTTPS in production.
- `ALLOWED_ORIGINS` contains exact origins for both frontends and any API-hosted frontend, separated by commas. Include scheme and port; omit paths and wildcards. For example: `https://coursehub.example,https://admin.coursehub.example`.
- `COOKIE_SAME_SITE` defaults to `lax`. If the API and frontend must operate on different sites, use `none` with production HTTPS. Browser third-party-cookie restrictions can still prevent that topology; using the same site avoids that dependency.
- `TRUST_PROXY_HOPS` defaults to `0`. Set the exact number of trusted reverse-proxy hops for the deployment. Restrict direct access to the application port when trusting a proxy.
- `AUTH_RATE_LIMIT` defaults to `20` attempts per `AUTH_RATE_WINDOW_SECONDS` window (default `900`). Authentication counters are stored in MongoDB by IP and, for administrator login, account. Throttled requests return `429` and `Retry-After`.
- `CLIENT_URL`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` and `REDIRECT_URI` configure Microsoft sign-in. Register the exact redirect URI in Azure. JWT signing keys and Azure secrets remain server-only.

The API creates TTL indexes for `sessions`, `oauthattempts` and `authratelimits` during startup. These are additive collections and work without multi-document transactions.

## Browser requests

Both frontends send cookies and an `X-Session-Role` hint: the hint only selects which authenticated session to use when both cookies exist. It does not grant a role. The user/admin bootstrap returns the session's `csrfToken`, also available from `GET /api/auth/csrf?role=student` or `role=admin` after authentication.

Cookie-authenticated mutations require an allowed Origin (or Referer when Origin is absent) and `X-CSRF-Token`. Authentication login has an explicit origin check; OAuth callbacks instead validate the browser-bound state. FilePond uses the same cookies and CSRF token. A request rejected with `CSRF_INVALID` may refresh the token and retry once, since rejection happens before the handler or multipart storage runs. Tokens are kept in memory, never local storage.

Sign-in preserves the requested pathname, query and hash. The destination must be a local frontend path, and resource permissions are checked again after sign-in. A missing academic synchronization record produces `needsCourseSync`; it does not invalidate an otherwise valid session.

## Errors and profile saves

API errors contain `error`, a stable `code`, a safe `message`, optional `fieldErrors`, and `requestId`. The same ID appears in `X-Request-Id` and the request's logging correlation ID. Provider credentials, stack traces and database details are excluded from responses.

Profile updates validate permitted fields, await persistence and return the saved name and semester. The editor reports success only after confirmation and keeps failed edits available for retry.

## OneDrive credential provisioning

Run `node scripts/generateOneDriveToken.js` from `server/` only when intentionally provisioning the selected storage account. `ONEDRIVE_REDIRECT_URI` optionally selects a separate Azure-registered callback, otherwise the script uses `REDIRECT_URI`.

A local HTTP callback listens only on loopback. For a remote callback or an occupied local port, paste the complete redirected URL, including state, into the terminal. Each attempt expires in 10 minutes, verifies state and destination, uses PKCE, and can be consumed once. The script saves tokens with owner-only permissions and does not print them. Routine tests mock both the token provider and token-file writes.
