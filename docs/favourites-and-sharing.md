# Saving, sharing and opening files

A favourite should take you back to the file you saved, even after its name or folder name changes. A shared link should take another person to that same file after sign-in.

For example, suppose CS101 contains `2026 / Lecture Notes / Introduction.pdf`. You can use the star on its file card to save it, or use **Share file** to copy a CourseHub link. The dashboard shows the saved file under **Favourites**, with its current course and folder path. Opening that path selects the file in the course browser.

## 1. Saving a favourite

Every visible file card has a favourite button. Its filled yellow state means the file is saved. Selecting it again removes the favourite. These buttons work in both the course browser and the dashboard's Favourites section, including on mobile.

The browser waits for the server before changing the saved state. If saving fails, it keeps the previous state and explains that the action can be retried. Repeated submissions for the same file do not create another favourite for that user.

A favourite has two different identifiers:

| Identifier | What it identifies                | What uses it                                      |
| ---------- | --------------------------------- | ------------------------------------------------- |
| `id`       | The existing library file         | Opening, sharing and saving that file.            |
| `_id`      | This user's saved favourite entry | Removing the favourite without deleting the file. |

Removing a favourite only changes that user's saved list. It does not delete the library file or change anyone else's favourites. Existing favourite-entry IDs are retained.

## 2. Names and paths follow the current library

The API resolves every favourite against the authorized course tree when it returns session or favourite data. It does not use the saved display path to find the file.

If `Introduction.pdf` becomes `Introduction and examples.pdf`, or `Lecture Notes` becomes `Class Notes`, the next response contains those current names. Successful content changes also invalidate the student's session query so an open dashboard can refresh its favourite descriptions. Other same-origin tabs receive that invalidation; separate origins use their normal session revalidation.

For a file shared between CS101 and MA101, the saved course is preferred while it still references the file. If CS101 is unlinked and MA101 still contains it, the favourite resolves through MA101. The file ID and favourite-entry ID stay the same.

The server determines the course, folder ID and display path.

## 3. Unavailable favourites

If a saved file is removed or becomes inaccessible, its entry appears as **Unavailable file**. The user can remove the entry from Favourites.

The response for that entry contains only its saved-entry ID, file ID and `available: false`. It does not include the filename, course, path, thumbnail or delivery links. The interface does not distinguish deletion from denied access.

This matters for moderation. A student cannot open another student's pending file through a favourite or share link. An uploader may inspect their own pending file, and authorized course managers may inspect files awaiting moderation. Every file endpoint rechecks that visibility.

## 4. Sharing a CourseHub destination

**Share file** opens one controlled dialog for the application. The dialog displays the filename and a CourseHub URL such as:

```text
https://coursehub.example/browse/CS101/folder-id?file=file-id
```

**Share folder**, in the desktop folder header, uses the same dialog with a folder destination.

Copying reports success only after the browser confirms the clipboard write. If clipboard access is denied, the dialog selects the link for manual copying and leaves the copy action available. Escape or **Close** dismisses it and returns focus to the trigger. Background scrolling is locked while the dialog is open.

The dialog explains that sign-in is required. For a pending file, it also explains that only the uploader and authorized course managers can open it. Copying a link does not approve a submission.

## 5. Opening a shared or saved link

When someone opens a file link:

1. CourseHub confirms the session before loading library content.
2. If sign-in is needed, it preserves the full pathname and query through authentication.
3. The server returns the course tree filtered for the current actor.
4. The browser finds the requested file in the selected folder, highlights its card with a small **Selected** marker and moves keyboard focus to it. The marker’s × button clears the selection.
5. The person chooses **View** or **Download file**. A shared link does not automatically launch a new tab or start a download.

If the file is absent from that authorized folder, the file list shows an unavailable message with **Try again** and **Clear selection**. It never substitutes a different file. If the folder or course itself is unavailable, the existing route error state applies.

A shared URL retains its selected course context. Unlinking that course can therefore make the old shared URL unavailable even if another course still has the file. Favourites can resolve another current course because the server holds the saved file identity.

## 6. Preview, download and thumbnails

File cards in Favourites and the course browser use the same preview and download actions.

Preview opens a tab from the user's click, checks the authenticated file metadata endpoint, and navigates to CourseHub's authorized preview endpoint. If the check fails, the blank tab closes and the original page explains the failure. The preview endpoint performs its own permission check before delivering content or using the configured Office viewer. Browsers that block the new tab receive an explicit pop-up message.

Individual downloads first request the authorized content URL, then fetch the bytes with the shared credentialed transport. Only a successful response is saved to the browser. An access or network failure leaves the file view available for retry. This currently buffers one file in the browser; the separately planned streamed archive work applies to folder ZIP downloads.

Thumbnails use the authenticated resource-ID endpoint. A missing or failed thumbnail becomes a file-type placeholder, so the card remains usable. Thumbnail failure does not generate a notification for every card.

## 7. API contract

| Request                                        | Input or result                                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/user/favourites`                    | `{ "id": "file-id", "code": "CS101" }`. Requires a visible file belonging to that course; returns the user's resolved favourites. Extra display fields are rejected. |
| `DELETE /api/user/favourites/:id`              | Removes that favourite entry from the authenticated user's list.                                                                                                     |
| `GET /api/user` and `GET /api/user/favourites` | Return current names and locations for accessible favourites, and minimal unavailable entries otherwise.                                                             |
| `GET /api/files/link/:id?courseCode=CS101`     | Checks visibility and course membership; returns authorized file metadata plus `code`, `folderId` and `path`.                                                        |
| `POST /api/files/download`                     | Validates the file and course context before returning a CourseHub content URL.                                                                                      |
| File preview, content and thumbnail endpoints  | Recheck the current session and file visibility before delivery.                                                                                                     |

These changes require no environment variables or database migration. They preserve file IDs and existing favourites. Deploy the matching API and student frontend together because the favourite creation body and presentation now follow this contract.

## 8. Verification and code locations

| File                                                                                                                                                        | Responsibility                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`server/services/fileLocation.js`](../server/services/fileLocation.js)                                                                                     | Resolve an authorized file's current course, folder and display path. |
| [`server/modules/user/user.controller.js`](../server/modules/user/user.controller.js)                                                                       | Present favourites and validate creation.                             |
| [`client/src/queries/favourites.js`](../client/src/queries/favourites.js)                                                                                   | Save/remove state and update the session query after persistence.     |
| [`client/src/screens/share/ShareProvider.jsx`](../client/src/screens/share/ShareProvider.jsx)                                                               | Own the single share selection and dialog.                            |
| [`client/src/utils/resourceLink.js`](../client/src/utils/resourceLink.js)                                                                                   | Build student frontend destinations.                                  |
| [`client/src/components/file-actions/useFileActions.js`](../client/src/components/file-actions/useFileActions.js)                                           | Common individual preview and download behavior.                      |
| [`client/src/screens/browse/components/file-display/FileSelectionNotice.jsx`](../client/src/screens/browse/components/file-display/FileSelectionNotice.jsx) | Explain an unavailable requested file within its folder view.         |
