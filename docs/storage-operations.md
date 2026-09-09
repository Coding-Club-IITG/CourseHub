# Storage, Uploads and Recoverable Cleanup

CourseHub stores two different parts of a resource in different places. **MongoDB holds the library record**: the filename, course/folder relationships, contributor, approval state and storage identifier. **OneDrive holds the file's bytes**. Graph and existing ImageKit metadata provide thumbnails.

For example, MongoDB may know that `Lecture 1.pdf` belongs in `CS101 → 2024 → Lectures`, while OneDrive holds the PDF itself. A successful upload or deletion must account for both. Updating one system and assuming the other succeeded can leave missing files, abandoned storage or misleading success messages.

The API coordinates that work through saved operations. This document explains the normal upload flow, what retry/cancellation mean, and how cleanup can recover after failure.

## 1. Persistent Storage Configuration

Set these values in the server environment:

| Setting                 | Purpose                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ONEDRIVE_FOLDER_ID`    | The dedicated OneDrive root beneath which CourseHub manages files.                                                                                                  |
| `ONEDRIVE_TOKEN_DIR`    | Persistent directory for the storage account's refresh token and access-token cache. Defaults to the server directory.                                              |
| `UPLOAD_TEMP_DIR`       | Directory for temporary received uploads. Defaults to `server/external/uploads`. API processes using the same upload journal need access to the same staging files. |
| `ONEDRIVE_REDIRECT_URI` | Optional registered callback for intentionally provisioning storage credentials.                                                                                    |
| `IMAGEKIT_*`            | Configuration for the existing ImageKit integration and stored thumbnail records.                                                                                   |

Keep token and temporary-upload directories writable by the API and separate from disposable release directories. Replacing application code should not erase the credentials or bytes needed to finish an existing operation.

From `server/`, `node scripts/generateOneDriveToken.js` provisions the selected storage account. It writes `onedrive-refresh-token.token` and `onedrive-access-token.json` with owner-only permissions. Refreshes use atomic file replacement so another process does not read a half-written token file. See [Authentication](authentication.md#7-onedrive-credentials-are-a-separate-setup-step) for the interactive callback flow.

The configured storage root is protected. Automatic cleanup can delete eligible individual files beneath it; it never automatically deletes that root or a provider folder.

## 2. Following One Upload Through the System

Suppose a student selects three PDFs for a course they are registered in.

1. **Read the limits.** The browser gets the current upload limits from the authenticated API and checks the selection.
2. **Describe the batch.** It submits the parent folder, course context and each file's name/byte size. The server creates the contribution and file identities.
3. **Send the bytes.** Each PDF is received into a randomly named temporary file. The API verifies actual byte counts and the association with the owned contribution.
4. **Transfer to OneDrive.** The worker sends the file in bounded chunks using a stable, generated storage name.
5. **Publish the library record.** The file is attached to the authorized folder with the correct contributor and approval state. Permissions are checked again before publication.
6. **Report the result.** The browser follows the operation until each file succeeds, fails or is cancelled.

A normal student's contribution requires moderation. The uploader can inspect their own pending submission, and authorized BRs/administrators can inspect and moderate it. Other students cannot use thumbnails, counts or download links to discover those pending files. Uploads authorized for direct management use the server's approval decision; a client-supplied uploader or approval flag is not trusted.

## 3. Limits and Filenames

The agreed limits are enforced by the server, including the bytes actually received:

| Limit                         | Value                    |
| ----------------------------- | ------------------------ |
| One file                      | 100 MiB: 104857600 bytes |
| Files in a batch              | 40                       |
| Total bytes in a batch        | 1 GiB: 1073741824 bytes  |
| Concurrent receives per batch | 2                        |

A manifest claiming a smaller size does not bypass the byte limit. Empty files and unsupported filenames, including path traversal, control characters and reserved device names, are rejected.

Display names are separate from temporary and storage names. Two people can upload files both called `Notes.pdf` without those files sharing a temporary path or overwriting one another's storage identity. Generated names stay stable for retries of the same entry.

Across API processes, eight receiving slots bound staged file data to 800 MiB. The content worker uploads at most two files concurrently. Busy staging receives return a retryable `409`; incomplete multipart receives expire after 15 minutes. Processing, failure and restart recovery clean up temporary files and stale reservations.

## 4. Partial Success, Retry and Cancellation

### Example: Two PDFs Finish and the Third Fails

The two successful PDFs remain published. The result keeps them visible while showing the third file's error. Retrying the batch should retry only the unfinished entry, using its existing identity.

If that entry still needs bytes, select and resend the same failed file. If its storage ID was already recorded before a later failure, the server may be able to finish publication without uploading it again. Reopening the page cannot restore a browser-held File object, so the user may need to reselect the original file after a reload.

The compact activity notice links back to the upload dialog. The detailed per-file results, retry actions and cancellation controls live in the dialog. Successful files are not repeated as failures merely because another file failed.

### What Cancel Means

Cancellation stops unfinished work and cleans unpublished storage. It keeps files that were already published successfully.

Closing the dialog or browser does not cancel work already accepted by the server. Use the explicit cancellation action when that is the intended outcome. Cancellation can itself need time or recovery if a provider is unavailable; a request to cancel is not proof that cleanup has already finished.

The upload owner can cancel their batch. A course manager inspecting someone else's upload does not acquire ownership of its retry-bytes or cancellation controls.

## 5. API Walkthrough

The upload endpoints require a session, its role selector and CSRF protection for writes. The server resolves folder/course membership independently of the supplied context.

1. Read `GET /api/contribution/limits`.
2. Create a batch with `POST /api/contribution/` and an `Idempotency-Key` header. Include `parentFolder`, `courseCode`, optional `description`, and `manifest: [{"name":"Notes.pdf","size":1024}]`.
3. Send each multipart `file` to `POST /api/contribution/upload`, with `contribution-id` set to the returned operation ID and `upload-file-id` set to that entry's ID.
4. Poll `GET /api/operations/:id` for actual file state/progress.
5. Use `POST /api/operations/:id/retry` for permitted unfinished work, or `POST /api/operations/:id/cancel` for owner cancellation.

The idempotency key is 16–100 letters, digits or hyphens. It identifies the same intended batch across repeated requests. Reusing a key with different contents returns `409`, instead of silently treating a different upload as the original one.

The upload-receive response is `202`: bytes have been accepted for processing. The browser must follow the operation to know whether they were stored and published. A successful HTTP receive is not the final upload result.

## 6. Downloads, Previews and Thumbnails

Browsers ask CourseHub for a resource by its database ID:

- `GET /api/files/content/:id` for file content.
- `GET /api/files/preview/:id` for supported preview delivery.
- `GET /api/files/thumbnail/:id` for thumbnail delivery.

Before contacting storage, the API checks whether the actor can see that file. The storage service resolves the stored provider ID within the configured root. An arbitrary Graph or sharing URL supplied by the browser is not a download authority.

The common Graph client handles pagination, bounded timeouts/retries and token refresh. Thumbnail delivery refreshes expired Graph thumbnails and supports authorized delivery of existing ImageKit thumbnails. Supported Office previews use the provider conversion path.

Authenticating these CourseHub endpoints does not revoke sharing permissions that were previously issued directly by OneDrive or ImageKit. Those external permissions need their own inventory and reviewed provider changes.

## 7. How Deletion Recovers From Failure

File deletion, folder/year removal, contribution rejection and course deletion can require several database/provider steps. Their API responses return `202` with an operation ID and status URL.

The worker follows a saved plan:

1. Determine the real affected resources and courses on the server.
2. Save the resource IDs and provider cleanup identifiers before any destructive side effect.
3. Mark the affected resources as deleting and reserve the relevant courses against conflicting writes.
4. Perform the planned provider and metadata cleanup, recording completed steps.
5. Mark the operation complete and release the locks.

The saved plan and checklist are the **operation journal**. If the process stops after OneDrive deletes a file but before the checklist is updated, retrying sees that the file is already absent and treats that cleanup as successful. It does not need to recreate the file or lose the remaining cleanup IDs.

For shared content, the plan matters just as much: removing a folder/year unlinks the active course, while deleting an individual shared file affects every referencing course after an explicit warning. [Course Linking & Shared Folders](course_link_logic.md) gives examples of both outcomes.

Temporary failures are retried with a bounded delay. If deletion cannot finish, the affected content stays unavailable and the necessary course locks remain held. An administrator can inspect the operation, fix the provider/configuration problem and retry through `/admin/operations`. Completed steps are retained; a crash immediately after completion but before lock release is also recoverable.

## 8. Inventory and Acceptance Checks

From `server/`, this command inventories stored provider references without changing them:

```sh
node scripts/inventoryStorage.js --database coursehub --report '../~review/storage-inventory.json'
```

The report identifies protected-root/malformed IDs and stored sharing/thumbnail references. Sharing URLs are represented by a host and fingerprint rather than exposing the full bearer URL. A metadata inventory does not prove what access the provider currently grants.

The relevant provider contracts are Microsoft's [upload sessions](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0), [pagination](https://learn.microsoft.com/en-us/graph/paging), [throttling](https://learn.microsoft.com/en-us/graph/throttling), and [format conversion](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0).
