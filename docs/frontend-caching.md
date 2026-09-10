# How CourseHub keeps browsing data current

A course can contain years, nested folders and many files. CourseHub should reuse that data while you move around, but it must also notice when someone else changes it. A deleted final file must produce an empty folder, and a renamed shared folder must update in every course that uses it.

Both frontends use TanStack Query for course data. Course and folder selection come from the URL. Temporary choices, such as an open dialog or an unsaved name, stay in local React state.

## What happens when you open a course

Suppose you open `/browse/CS101/folder-id?file=file-id#preview`.

1. The session provider confirms who you are. Until that finishes, the browser does not fetch the course.
2. The course query requests the authorized course tree from the API. The server resolves course membership, removes files you cannot see and returns the capabilities for the visible resources.
3. The course browser finds the requested folder inside that tree. The containing year, sidebar selection and folder contents all come from the same result.
4. Moving to another folder in that course changes the URL. It does not write a second folder tree or a navigation-history stack.
5. Reloading the page restores the selection from its URL and fetches fresh authorized data. Browser Back and Forward use the same route state.

A course URL without a folder selects the latest year in the server's ordered year list. A URL that explicitly names a year or folder keeps that selection. If the named folder has been deleted or is inaccessible, the page explains that it is unavailable and offers retry and a link to the course. It does not silently substitute another folder.

Bookmarks using a course's old code continue through the server's alias resolution. Once the response identifies the current code, controls and subsequent folder links use that canonical code.

## Where data lives

| Data                                                               | Source and lifetime                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Student or administrator session                                   | A shared query for that application's session role; see [frontend sessions](frontend-sessions.md).                            |
| Student course tree                                                | An in-memory query scoped to the actor, capabilities, normalized course code and resource kind.                               |
| Selected year and folder                                           | Derived from the route and current course tree; no separate saved copy.                                                       |
| Administrator course list, course dashboard and Courses Without BR | In-memory queries using the administrator's actor scope and resource kind.                                                    |
| Recently browsed extra courses                                     | Sidebar shortcuts derived from that actor's cached course results; they disappear when the cache expires or the session ends. |
| Others                                                             | The user's server-saved course list. It survives reloads and does not grant management rights.                                |
| Dialog state, filters and unsaved form input                       | Local component state.                                                                                                        |

The student profile and favourites also read the session query directly. Profile and course-list updates use the saved response to update that session data.

Course data stays in memory and does not depend on local or session storage. Denying browser storage or exhausting a storage quota therefore cannot stop browsing. Others and favourites are saved on the server.

## Freshness and server revisions

An active course query revalidates every 30 seconds and on focus or reconnect. Opening a course again revalidates it even if it has a cached result. Inactive results remain in memory for up to five minutes. The cache's 15-second freshness setting also allows ordinary query consumers to share recent results.

The server adds a `revision` to authorized course and folder responses and to administrator course dashboards. This is a hash of the returned presentation, including nested contents and capabilities. It is calculated after visibility filtering. A change to a pending file that you cannot see does not enter your presentation hash.

This approach also notices direct database repairs and historical records without requiring every old mutation to maintain a new counter. It adds no database field, changes no ID and needs no data migration.

When the revision is unchanged, the query cache can retain its existing object references. When it changes, the new result replaces the previous result, including a genuinely empty `children` array. The browser never chooses a response because it contains more years or files.

Revalidation still makes an authenticated API request. The revision is a freshness aid, not an authorization token or a permanent promise that a file is accessible. Preview, thumbnail and download endpoints continue checking the current session and resource visibility independently.

## Shared changes and background operations

Consider a folder shared by CS101 and MA101. Renaming it in MA101 must also refresh an already-open CS101 view.

The shared browser transport observes successful content mutations. It invalidates queries for the affected course codes and cached trees that reference those shared courses. Course lists are also invalidated. If a response does not provide a complete affected-course list, it conservatively invalidates all library queries rather than risk leaving a sibling course stale.

Long-running operations need a second refresh when their results become available. The cache observes terminal operation states, including partial uploads and failures that may have completed some steps. Each distinct operation result invalidates affected data once. Repeated polling of the same completed result does not repeatedly reload the course. Course renames, deletions and academic synchronization also revalidate session data, where registered-course references are displayed.

Same-origin tabs exchange invalidation notices through BroadcastChannel. These notices contain course codes and change/logout signals, not file trees, tokens or user records. A shared rename therefore updates another open tab promptly. Deployments on separate origins cannot use the same browser channel; their views catch up through the ordinary focus, reconnect and periodic checks.

## Switching courses, errors and logout

Course query functions consume the cancellation signal supplied by TanStack Query. Leaving a course while its request is pending aborts that read. A late response from CS101 cannot become the selected MA101 tree. Queries are keyed by actor and capabilities, so they cannot be reused as another user's authorized view.

A changed actor or changed course capabilities removes the previous resource queries. Logout cancels queries, clears cached user data and tells other same-origin tabs of that role to leave protected content. A response that started before logout cannot restore the old actor afterward.

A failed revalidation shows an explicit retryable state. Inaccessible content is not rendered from an old successful result after a denied refresh. The requested URL remains available for a successful retry. Administrator list failures likewise stay separate from valid empty lists.

These changes consolidate data flow; they do not redesign the upload modal or administrator tables. Upload progress, partial results and cancellation remain in the upload operation interface. Broader table, dialog and mobile-management improvements are separate remediation batches.

## Code to start with

| File                                                                                              | Responsibility                                                             |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`packages/browser/src/library.js`](../packages/browser/src/library.js)                           | Query keys, freshness settings, shared invalidation and cross-tab notices. |
| [`packages/browser/src/session.js`](../packages/browser/src/session.js)                           | Session queries and removal of data from a previous actor.                 |
| [`client/src/queries/course.js`](../client/src/queries/course.js)                                 | Student course query and successful-response validation.                   |
| [`client/src/queries/CourseBrowserProvider.jsx`](../client/src/queries/CourseBrowserProvider.jsx) | Derive the visible folder and year from the current route and tree.        |
| [`server/services/authorization.js`](../server/services/authorization.js)                         | Build the authorized course/folder presentation before adding a revision.  |
| [`server/utils/resourceRevision.js`](../server/utils/resourceRevision.js)                         | Calculate a revision from that presentation.                               |

The implementation follows TanStack Query's [query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) and [cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) contracts, with the explicit timings described above.
