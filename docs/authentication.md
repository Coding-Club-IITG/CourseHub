# Authentication and Sessions

Authentication answers **who is making a request**. Authorization answers **what that person may do**. CourseHub performs both checks on the API, even when the browser already hides a button or shows the person as a BR.

For example, a signed-in student can browse approved material. A BR can also manage courses established by their current and historical academic registrations. Typing another course code into a request does not give that BR access to manage it. Adding the course under Others only creates a browsing shortcut.

## 1. The Two Ways to Sign In

Students sign in with their IIT Guwahati Microsoft account. Administrators sign in to the separate admin portal with an explicitly provisioned CourseHub administrator account. A student session, including a BR's session, does not become an administrator session.

### Student Microsoft Sign-In

The login flow works as follows:

1. The browser opens CourseHub's sign-in endpoint, carrying a local destination such as `/profile` if the person was trying to visit a protected page.
2. The API creates a short-lived login attempt and binds it to that browser. It records a random **state** value and a secret used for **PKCE**.
3. Microsoft authenticates the institutional account and redirects the browser to CourseHub's registered callback.
4. The API verifies that the callback belongs to the same browser and login attempt, has not expired, and has not already been consumed.
5. The API exchanges the authorization code using the saved PKCE verifier, identifies the student and creates a CourseHub session.
6. The browser returns to the requested destination, or through the course-refresh screen when synchronization is due.

State connects the callback to the login that started it. PKCE connects the authorization-code exchange to the secret saved for that attempt. Together with one-time callback consumption, these checks prevent a callback from being accepted merely because it contains a code.

### Administrator Provisioning and Login

There is no public “create administrator” endpoint or shared administrator password embedded in frontend headers.

To intentionally create an administrator, configure `MONGO_URI`, `ADMIN_USER_ID` and `ADMIN_PASSWORD` in the server's private environment and run this from `server/`:

```sh
npm run admin
```

The user ID must be 1-128 characters and the password must be at least 12 characters. Provisioning validates the supplied credentials before connecting, stores a password hash, and refuses to replace an existing administrator with the same identity. Running it again is not a password-reset procedure.

After provisioning, sign in through the admin portal. Keep these credentials and all signing keys out of `VITE_*` variables: those variables are included in browser code.

## 2. What a Session Contains and How Long It Lasts

After either login flow, the API issues a signed token in an HTTP-only cookie. The token identifies a session record saved in MongoDB. The browser sends the cookie on API requests; application JavaScript does not need to read the cookie's value.

| Session       | Cookie       | Lifetime |
| ------------- | ------------ | -------- |
| Student or BR | `token`      | 24 days  |
| Administrator | `adminToken` | 7 days   |

On each protected request, the API checks the signature, expiration, saved session record and account existence. A token by itself is insufficient if its session has been revoked. Tokens issued before persisted sessions were introduced require a fresh sign-in.

Logout first revokes the current session in MongoDB, then clears the matching cookie. Replaying that token after logout fails. Logging out on one device does not revoke the independent sessions on the person's other devices.

The session collections have TTL indexes for eventual cleanup of expired records. Request authentication also checks expiry directly; access does not remain valid while waiting for expired records to be removed.

## 3. How Frontend Requests Select the Session

A developer can have both the student and administrator apps open in the same browser, with both cookies present. Requests therefore include `X-Session-Role: student` or `X-Session-Role: admin` to select the appropriate session.

This header is a selector, not proof of privilege. Sending `admin` without a valid administrator session does not authorize the request.

The student HTTP client sends cookies with `withCredentials: true`; the admin transport uses credentialed fetch requests. The authenticated bootstrap responses also return a `csrfToken`, which the transports keep in memory.

## 4. Protecting Requests That Change Data

Cookies are automatically attached by the browser. CourseHub therefore checks additional evidence before accepting a cookie-authenticated write, such as renaming a folder, changing a profile or uploading a file.

For these requests, the API expects:

- An allowed `Origin`, or an allowed `Referer` when Origin is absent.
- The session's `X-CSRF-Token` header.
- A valid session with permission for the requested action.

The CSRF token is also available through authenticated `GET /api/auth/csrf?role=student` or `?role=admin`. The shared transports and FilePond requests use the same protection.

If the server returns `CSRF_INVALID`, a transport can refresh the CSRF token and retry once. This is safe because the rejected request stops before the action handler or multipart storage runs. That retry rule does not authorize blindly repeating arbitrary failed writes.

Login entrypoints have their own origin/login-attempt checks. The Microsoft callback validates its browser-bound state instead of requiring the normal mutation header.

## 5. Configuring Local and Production Origins

An **origin** is the scheme, host and port, such as `http://localhost:5173`. It does not include a path such as `/admin/`.

For the local setup in the README, the relevant values are:

```dotenv
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
CLIENT_URL=http://localhost:5173
API_BASE_URL=http://localhost:8080
REDIRECT_URI=http://localhost:8080/api/auth/login/redirect
COOKIE_SAME_SITE=lax
TRUST_PROXY_HOPS=0
```

Use matching hosts throughout the configuration. Opening a frontend at `127.0.0.1` while its API/callback configuration uses `localhost` can change which origin and cookie host are involved. Either use the supplied localhost setup consistently or update all relevant values together.

| Setting                                                     | Purpose                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ALLOWED_ORIGINS`                                           | Exact comma-separated frontend origins. Include the scheme and port; do not include paths or wildcards.                                                |
| `CLIENT_URL`                                                | Student frontend origin used for login redirects.                                                                                                      |
| `REDIRECT_URI`                                              | Microsoft callback URL; register the same URL in the Entra application.                                                                                |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | The configured Microsoft application and tenant. The secret stays on the server.                                                                       |
| `JWT_SECRET`, `ADMIN_JWT_SECRET`                            | Server-side signing keys for the respective session types.                                                                                             |
| `NODE_ENV`                                                  | Production enables Secure cookies and requires HTTPS for those cookies.                                                                                |
| `COOKIE_SAME_SITE`                                          | Defaults to `lax`. The server allows `none` only with production Secure cookies; cross-site deployments need appropriate browser/cookie configuration. |
| `TRUST_PROXY_HOPS`                                          | Number of trusted reverse-proxy hops; defaults to zero. Match the actual deployment topology.                                                          |

Restart the API and affected Vite processes after changing their environment files. See [Local Setup](../README.md#local-setup) for the startup order and expected URLs.

## 6. Destinations, Refresh and Failure States

A protected destination is preserved as a local pathname, query and hash through login. After authentication, the server checks access to the requested resource again. Remembering a destination does not remember an old permission grant.

Academic refresh is separate from session validity. An absent refresh record or an empty legitimate semester history does not make the login invalid. A refresh failure can leave the student signed in with their previously saved courses. See [Academic Synchronization](academic-synchronization.md) for that flow.

Typical API failures have different meanings:

| Status | Meaning                                                                                | Appropriate UI response                                                                      |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `401`  | Authentication is missing, expired or revoked.                                         | Ask the person to sign in, preserving a valid destination.                                   |
| `403`  | The authenticated request is not allowed, or its write protection failed.              | Show the permission error; refresh CSRF only for the explicit `CSRF_INVALID` case.           |
| `404`  | The resource is missing or intentionally inaccessible without revealing its existence. | Show an unavailable-resource state.                                                          |
| `429`  | Authentication requests have been throttled.                                           | Respect the returned `Retry-After`.                                                          |
| `5xx`  | The request could not finish because of a server/dependency failure.                   | Show a retryable failure where appropriate; do not claim the session is necessarily expired. |

Request errors generally include a safe message, stable code and request ID, with field errors when applicable. Stack traces, provider credentials and database details are not sent to the browser. Profile saves return the saved name/semester only after persistence; failed edits remain available in the editor.

Authentication throttling defaults to 20 attempts per 900-second window, configurable through `AUTH_RATE_LIMIT` and `AUTH_RATE_WINDOW_SECONDS`. Counters are stored in MongoDB by IP and, for administrator login, account.

## 7. OneDrive Credentials Are a Separate Setup Step

Student login identifies the person using CourseHub. The API's OneDrive credentials identify the selected account used for library storage. Successfully logging a student in does not itself provision the storage account.

To intentionally provision that account, run `node scripts/generateOneDriveToken.js` from `server/`. `ONEDRIVE_REDIRECT_URI` can select a separate registered callback; otherwise the script uses `REDIRECT_URI`.

A local HTTP callback listens on loopback. With a remote callback or an occupied local port, the script accepts the complete redirected URL, including state, in the terminal. The attempt expires after 10 minutes and validates its destination, state and PKCE exchange. Tokens are saved privately rather than printed. [Storage configuration](storage-operations.md) explains where those files should live.
