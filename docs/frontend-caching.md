# How CourseHub keeps browsing data current

A course can contain years, nested folders and many files. CourseHub should reuse that data while you move around, but it must also notice when someone else changes it. A deleted final file must produce an empty folder, and a renamed shared folder must update in every course that uses it.

Both frontends use TanStack Query for course data. Course and folder selection come from the URL. Temporary choices, such as an open dialog or an unsaved name, stay in local React state.

## What happens when you open a course

Suppose you open `/browse/CS101/folder-id?file=file-id#preview`.

1. The session provider confirms who you are. Until that finishes, the browser does not fetch the course.
2. After a successful session check, the browser restores any matching saved course trees. The course query can display a restored tree while requesting a fresh authorized tree from the API. The server resolves course membership, removes files you cannot see and returns the capabilities for the visible resources.
3. The course browser finds the requested folder inside that tree. The containing year, sidebar selection and folder contents all come from the same result.
4. Moving to another folder in that course changes the URL. It does not write a second folder tree or a navigation-history stack.
5. Reloading the page restores the selection from its URL, reuses a matching saved tree after session verification and refreshes it in the background. Browser Back and Forward use the same route state.

A course URL without a folder selects the latest year in the server's ordered year list. A URL that explicitly names a year or folder keeps that selection. If the named folder has been deleted or is inaccessible, the page explains that it is unavailable and offers retry and a link to the course. It does not silently substitute another folder.

Bookmarks using a course's old code continue through the server's alias resolution. Once the response identifies the current code, controls and subsequent folder links use that canonical code.

## Where data lives

| Data                                                    | Source and lifetime                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Student or administrator session                        | A shared query for that application's session role - see [frontend sessions](frontend-sessions.md).     |
| Student course tree                                     | An in-memory query with a bounded `sessionStorage` snapshot, scoped to the API, actor and capabilities. |
| Selected year and folder                                | Derived from the route and current course tree; no separate saved copy.                                 |
| Administrator course list, filters and course dashboard | In-memory queries using the administrator's actor scope and resource kind.                              |
| Recently browsed extra courses                          | Sidebar shortcuts derived from that actor's cached course results, including restored trees.            |
| Others                                                  | The user's server-saved course list. It survives reloads and does not grant management rights.          |
| Dialog state, filters and unsaved form input            | Local component state.                                                                                  |

The student profile and favourites also read the session query directly. Profile and course-list updates use the saved response to update that session data.

Course browsing still works when browser storage is unavailable or full. In that case the application uses its in-memory cache and ordinary API requests. Others and favourites are saved on the server.

## Persistence across reloads

Student course trees are saved in `sessionStorage`, which survives reloads in the same tab. Administrator queries remain in memory.

A new page must complete its session request before restoring anything. A restored tree is always stale for query purposes, so even an immediate reload makes a background request. Restoring a snapshot does not renew its expiry. If an inactive query leaves memory, its bounded snapshot can still be reused within the same verified session.

Snapshots expire after 24 hours. The cache retains up to 20 recently fetched course queries with about 2 MB of storage, and skips individual trees above half that budget. Writes are combined over 250 milliseconds and flushed when the page hides or unloads. If the available quota is smaller, older entries are dropped until the snapshot fits.

A failed session check or logout clears saved trees. A failed course refresh removes that course's saved copy and keeps the existing retryable error state.

## Freshness and server revisions

An active course query revalidates every 30 seconds. Opening a course again, focusing the window or reconnecting revalidates it once its cached result is more than 15 seconds old. Inactive results remain in memory for up to 30 minutes. Quickly returning to the same course therefore reuses the recent result without another request. Explicit invalidation still refreshes a result immediately, regardless of its age.

The API loads the requested course trees and their relevant shared owners for resource reads. Favourites and contribution lists batch their file lookups within the request. This avoids scanning every folder or issuing a separate database query for each displayed file while retaining the same membership and visibility checks. Mutation planning continues using the complete graph where it needs all affected owners.

The server adds a `revision` to authorized course and folder responses and to administrator course dashboards. This is a hash of the returned presentation, including nested contents and capabilities. It is calculated after visibility filtering. A change to a pending file that you cannot see does not enter your presentation hash.

This approach also notices direct database repairs and historical records without requiring every old mutation to maintain a new counter. It adds no database field, changes no ID and needs no data migration.

When the revision is unchanged, the query cache can retain its existing object references. The first response after restoring a snapshot is compared in full.

Revalidation still makes an authenticated API request. The revision is a freshness aid, not an authorization token or a permanent promise that a file is accessible. Preview, thumbnail and download endpoints continue checking the current session and resource visibility independently.

## Shared changes and background operations

Consider a folder shared by CS101 and MA101. Renaming it in MA101 must also refresh an already-open CS101 view.

The shared browser transport observes successful content mutations. It invalidates queries for the affected course codes and cached trees that reference those shared courses, and removes their persisted copies immediately. Active contribution lists revalidate every 30 seconds so approvals made elsewhere become visible. If a response does not provide a complete affected-course list, it conservatively invalidates all library queries rather than risk leaving a sibling course stale.

Long-running operations need a second refresh when their results become available. The cache observes terminal operation states, including partial uploads and failures that may have completed some steps. Each distinct operation result invalidates affected data once. Repeated polling of the same completed result does not repeatedly reload the course. Course renames, deletions and academic synchronization also revalidate session data, where registered-course references are displayed.

Same-origin tabs exchange invalidation notices through BroadcastChannel. These notices contain course codes and change/logout signals, not file trees, tokens or user records. A shared rename therefore updates another open tab promptly. Deployments on separate origins cannot use the same browser channel; their views catch up through the ordinary focus, reconnect and periodic checks.

## Switching courses, errors and logout

Course query functions consume the cancellation signal supplied by TanStack Query. Leaving a course while its request is pending aborts that read. A late response from CS101 cannot become the selected MA101 tree. Queries are keyed by actor and capabilities, so they cannot be reused as another user's authorized view.

A changed actor or changed course capabilities removes the previous resource queries and saved course trees. Logout cancels queries, clears cached user data and tells other same-origin tabs of that role to leave protected content and clear their snapshots.

A failed revalidation shows an explicit retryable state. Inaccessible content is not rendered from an old successful result after a denied refresh. The requested URL remains available for a successful retry. Administrator list failures likewise stay separate from valid empty lists.

These changes consolidate data flow; they do not redesign the upload modal or administrator tables. Upload progress, partial results and cancellation remain in the upload operation interface. Broader table, dialog and mobile-management improvements are separate remediation batches.

## Code to start with

| File                                                                                              | Responsibility                                                             |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`packages/browser/src/library.js`](../packages/browser/src/library.js)                           | Query keys, freshness settings, shared invalidation and cross-tab notices. |
| [`packages/browser/src/coursePersistence.js`](../packages/browser/src/coursePersistence.js)       | Bounded course snapshots, session-gated restoration and storage cleanup.   |
| [`packages/browser/src/session.js`](../packages/browser/src/session.js)                           | Session queries and removal of data from a previous actor.                 |
| [`client/src/queries/course.js`](../client/src/queries/course.js)                                 | Student course query and successful-response validation.                   |
| [`client/src/queries/CourseBrowserProvider.jsx`](../client/src/queries/CourseBrowserProvider.jsx) | Derive the visible folder and year from the current route and tree.        |
| [`server/services/authorization.js`](../server/services/authorization.js)                         | Build the authorized course/folder presentation before adding a revision.  |
| [`server/utils/resourceRevision.js`](../server/utils/resourceRevision.js)                         | Calculate a revision from that presentation.                               |

The implementation follows TanStack Query's [query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) and [cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) contracts, with the explicit timings described above.
