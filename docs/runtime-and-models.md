# How Requests and Database Models Work

CourseHub runs on Node 24, Express 5 and Mongoose 9. Express handles HTTP requests; Mongoose describes and validates the records stored in MongoDB. These upgrades keep the existing API, resource IDs and stored course relationships while making failures and malformed writes easier to detect.

This guide explains the behavior that matters when adding a handler, investigating a failed request or preparing a data migration.

## 1. An Async Request Must Finish With a Response

An async Express handler can now await a database query directly. If that promise rejects, Express forwards the rejection to the application's error middleware. Handlers no longer need a separate wrapper just to forward rejected promises.

For example, an authenticated request might load a course and then return its visible folders. If MongoDB fails during that read, the request goes through the safe error response path. It should not leave the browser waiting indefinitely or expose an internal database exception to the student.

The error response keeps a stable code, a safe message and a request ID. Use the request ID to connect a reported browser failure to server logs. The status still matters: an absent session is 401, a denied action is 403, and content that cannot be disclosed uses 404 where appropriate. Changing Express does not replace resource-level authorization.

Express can only catch work connected to the handler's returned promise. A timer, event listener or provider callback that runs later still needs its own error boundary. Background operations continue to record failures through the operation worker; do not turn them into detached promises and expect HTTP middleware to recover them.

## 2. API Misses and Browser Routes Have Different Outcomes

An unknown `/api/...` path returns a JSON 404. It must never fall through to the HTML page used for browser navigation. Otherwise a misspelled endpoint can look like a successful response and fail later when the frontend tries to parse it.

The server's browser fallback covers the root and nested paths using Express 5's named wildcard syntax. Its static-file root is absolute, so file delivery does not depend on which directory launched the process. Delivery errors pass through the same error middleware as other requests.

The independently deployed frontends still rely on their web server to serve the appropriate app entry point for browser routes. This Express fallback does not replace the web-server configuration for `/admin/` or student bookmarks.

## 3. Shutdown Lets Existing Work Finish

When shutdown starts, the HTTP server stops accepting new connections. Responses already in progress can finish while the operation worker stops taking new work. Database disconnect and log flushing happen after those tasks have drained.

Consider a download that has already written its first bytes when PM2 reloads the API. Closing the database immediately could interrupt the work needed to finish the response. The shutdown sequence now keeps those dependencies available until the in-flight work has completed. Repeated shutdown signals share the same shutdown promise.

Long-running changes remain journaled operations. Their restart recovery is described in [Storage, Uploads and Cleanup](storage-operations.md); graceful HTTP shutdown is an additional part of that lifecycle, not a replacement for the journal.

## 4. Database Queries Reject Unknown Fields

Production models import the configured Mongoose instance from `server/config/mongoose.js`. It explicitly enables schema strictness and sets `strictQuery` to `throw`.

Suppose a developer writes a destructive filter using a misspelled field. Silently removing that field could turn a narrow query into a much broader one. Throwing instead lets the request fail before the query changes records.

This protects against unknown fields; it does not prove that a known filter is safe. A handler must still resolve the resource on the server, validate its course context and check permissions. Never pass a request body directly to a destructive database operation.

Mongoose middleware uses its current promise-based API. Password hashing still completes before a new administrator is saved, and existing password values are not reset during this upgrade. Updates that return the saved document use `returnDocument: "after"` so callers receive the persisted result.

## 5. Course References Have a Defined Shape

Current courses, Others and semester history now have defined nested schemas instead of accepting arbitrary arrays. A course reference carries its code and optional existing identity, name and colour. A history entry carries its course list and applicable semester/year/session information.

For example, a current course reference can contain:

```json
{ "code": "CS101", "name": "Introduction to Computer Science" }
```

A history entry can contain:

```json
{
    "semester": 3,
    "year": 2025,
    "session": "July-Nov",
    "courses": [{ "code": "CS101", "name": "Introduction to Computer Science" }]
}
```

The schemas reject unknown nested fields and invalid supplied values. They preserve explicit IDs and do not manufacture new identities for these embedded references. Historical metadata that was optional remains optional for compatibility; a missing year is not guessed from today's date.

The authoritative synchronization service validates the fields it writes. A profile-only edit remains targeted, so changing a student's display name does not rewrite an older course-history structure as a side effect. The inventory and migration tools are responsible for reporting malformed historical records before a reviewed conversion. See [Course References and Data Maintenance](data-maintenance.md).

## 6. File Sizes Preserve Their Meaning

New file metadata can store `sizeBytes` as a nonnegative safe integer. It represents the actual byte count, which lets limits and display formatting use an unambiguous value. File counts also reject negative or fractional values.

Older files may still contain the `size` field. Reading those records remains supported. A value such as `"5"` cannot tell a migration whether the original writer meant five bytes or five megabytes, so this upgrade does not convert it automatically. The inventory reports ambiguous values for review and preserves the file's ID and provider identifiers.

Run inventory commands in their default dry-run mode before planning a conversion. Select a target and review backup/recovery steps before applying any migration. Installing Mongoose 9 itself does not run a data conversion or rebuild course content.
