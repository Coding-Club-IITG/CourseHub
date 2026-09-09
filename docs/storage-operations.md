# Storage, uploads, and recoverable cleanup

The API owns Graph access and runs a MongoDB-backed operation worker. Graceful shutdown waits for the current operation. Interrupted operations resume from their saved state on the next start.

## Persistent configuration

Set `ONEDRIVE_FOLDER_ID` to the dedicated CourseHub storage root. Automatic cleanup may delete individual files underneath that root: it never deletes the root or a provider folder.

Provision storage credentials with `node scripts/generateOneDriveToken.js` from `server`. Provisioning and refresh atomically write private files: `onedrive-refresh-token.token` and `onedrive-access-token.json`.

## Upload contract

1. Read authenticated `GET /api/contribution/limits`. Limits are **100 MiB per file**, **40 files per batch**, and **1 GiB per batch**. Empty files and unsupported path/control/device names are rejected.
2. `POST /api/contribution/` with an `Idempotency-Key` (16–100 letters, digits, or hyphens), `parentFolder`, `courseCode`, optional `description`, and `manifest: [{ name, size }]`. The server generates the contribution and file identities. Reusing a key with a different manifest returns `409`.
3. Send each file as multipart field `file` to `POST /api/contribution/upload`, with `contribution-id` set to the returned operation ID and `upload-file-id` set to its entry ID. Include session cookies, the session role, and CSRF token. Actual filename and byte count must match the manifest. The response is `202`, indicating receipt rather than publication.
4. Poll `GET /api/operations/:id`. Each entry reports progress, success, or failure. Successful files remain available if another file fails. Retry unfinished work with `POST /api/operations/:id/retry`: resend only failed files needing bytes, with the same identity and contents. A failed file whose storage ID is already recorded can finish without retransmission.
5. The owner may call `POST /api/operations/:id/cancel`. Cancellation keeps published files and cleans unpublished storage. It can remain in progress or need retry if a provider is unavailable. Closing the browser does not cancel server work. Reopen the upload from the activity notice; the browser may require the original failed files to be selected again.

At most 2 files per batch are received concurrently. 8 journaled staging slots bound temporary disk usage across API processes to 800 MiB of file data; one elected worker uploads at most 2 files concurrently. Busy requests receive a retryable `409`. Incomplete multipart receives expire after 15 minutes. Temporary files are removed after processing or failure, and stale reservations are recovered after restart.

Storage names are random and stable for retries. Display names and contributor names are separate metadata. PDF/image delivery and supported Office-to-PDF previews pass through authenticated resource-ID endpoints. Graph thumbnails are refreshed on expiry.

## Deletion and recovery

Inventory existing metadata with `node scripts/inventoryStorage.js --database coursehub --report ../~storage-inventory.json` from `server`. It lists stored sharing/thumbnail references and protected-root or malformed-ID records; sharing URLs are represented by their host and a fingerprint.

File, folder/year, contribution rejection, and whole-course deletion return `202` with an `operationId` and status URL. The journal records affected IDs and provider cleanup IDs before marking content as deleting or contacting providers. Ordered course locks prevent conflicting edits during cleanup. A shared folder/year is unlinked from the active course; an individual shared file is removed from every referencing course, after confirmation includes all affected course codes.

The worker persists completed cleanup steps, treats absent provider files/thumbnails as success, and retries temporary failures with bounded backoff. Content stays unavailable and its course locks remain held if deletion cannot finish. Administrators can inspect, filter, and retry operations at `/admin/operations`; upload owners and BRs can inspect their permitted operations.

If cleanup fails, restore the missing provider/database configuration and use the administrator retry action. Retry preserves completed steps and the identifiers needed for remaining cleanup. A crash between completion and lock release is recovered automatically.

## Verification

Graph contracts: [upload sessions](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0), [pagination](https://learn.microsoft.com/en-us/graph/paging), [throttling](https://learn.microsoft.com/en-us/graph/throttling), and [format conversion](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0).
