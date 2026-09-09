# Frontend Caching in the Student App

A course response can contain a complete hierarchy of years, folders and files. Fetching that hierarchy every time someone opens a sidebar item would repeat work, so the student app keeps browser-side copies for navigation.

For example, after opening `CS101`, the app can reuse its saved year/folder tree when the student moves between its folders. That can make navigation faster, but it also creates a freshness problem: another user may have renamed or deleted a resource since that copy was saved.

This document describes the **current implementation**, including its limitations. The browser cache is presentation data. The API still decides whether the person may view a file or perform an action; modifying a cached tree cannot grant permission.

## 1. Three Different Places Hold UI Data

| Location                    | Contents                                                                                    | Lifetime and purpose                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Redux memory                | Loaded course trees, selected course/year/folder, user data and temporary navigation state. | Drives the current app instance. A reload creates a new in-memory store.                                              |
| `sessionStorage.AllCourses` | An array of nested course trees.                                                            | Reuses course structure within the browser's tab session. Session bootstrap explicitly clears this stored tree cache. |
| `localStorage.LocalCourses` | Small course shortcuts containing `code`, `name` and optional `color`.                      | Can survive reloads/browser restarts. This older shortcut mechanism is separate from the server's saved Others list.  |

The browser-storage helpers live in [`frontendCache.js`](../client/src/utils/frontendCache.js). Tree validation and duplicate selection live in [`courseCache.js`](../client/src/utils/courseCache.js).

## 2. `AllCourses`: Saved Course Trees

A simplified payload looks like this. The IDs are explanatory labels rather than production MongoDB IDs:

```json
[
    {
        "_id": "course-cs101",
        "code": "CS101",
        "name": "Introduction to Computing",
        "children": [
            {
                "_id": "year-2024",
                "name": "2024",
                "childType": "Folder",
                "children": [
                    {
                        "_id": "lectures-folder",
                        "name": "Lectures",
                        "childType": "File",
                        "children": [
                            {
                                "_id": "lecture-file",
                                "name": "Lecture 1.pdf",
                                "isVerified": true
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
```

The file-browser reducer writes updated course trees through `writeAllCoursesCache`. Browse and sidebar code read them through `readAllCoursesCache` and look up a course by normalized code. Dashboard startup can also load a saved tree into Redux.

A read removes malformed JSON and falls back to an empty array. Sanitization rejects entries that are not course objects with a code and a `children` array. This checks basic shape; it does not prove that the response is fresh or that every child still exists on the server.

### How Duplicate Cached Trees Are Chosen

Codes such as `CS101`, `cs101` and `CS 101` compare as the same code. When duplicate entries exist, the current helper keeps the one with the most top-level children. A tie chooses the later candidate.

“Most top-level children” normally means more year entries. It does **not** mean the greatest total number of files, the newest server revision, or the most accurate tree.

Consider an older cached course with five years and a newer response with four because one year was deleted. The older object can win this comparison, preserving stale data even though the server returned the correct smaller tree.

The current `hasUsableCourseTree` helper also requires at least one top-level child. An empty `children` array can be valid server data, yet this helper treats it as unusable. Empty-response handling and revision-based revalidation are still part of the planned cache replacement.

## 3. `LocalCourses`: Browser Shortcuts Versus Others

A `LocalCourses` value is much smaller:

```json
[
    { "code": "CS101", "name": "Introduction to Computing", "color": "#6F8FFE" },
    { "code": "MA201", "name": "Linear Algebra", "color": "#FECF6F" }
]
```

The utility normalizes codes for comparison, keeps one shortcut per code and stores only the small display fields. The app startup still contains an adapter that moves older `sessionStorage.LocalCourses` values into local storage. The user reducer can add browser shortcuts when browsing a course.

This is different from pressing **Add Course** on the dashboard. That action saves the course through `/api/user/readonly`; the server returns the updated `user.readOnly` list used for Others. The server record, rather than a browser shortcut, is the saved account-level choice.

Neither list grants academic registration or BR management rights. A course added for browsing remains subject to the same API permissions as every other course.

The current app contains overlapping shortcut/cache state. For example, Dashboard clears the Redux local shortcut list while the persisted local-storage key can still exist. Do not assume that clearing Redux always clears browser storage, or describe `LocalCourses` as the authoritative source for Others.

## 4. Session Restoration and Logout

`getUser()` clears `sessionStorage.AllCourses` before requesting the authenticated user. This makes session restoration discard saved trees that may belong to an earlier actor or permission state.

A normal student logout revokes the API session and clears the in-memory CSRF token. Redux's logout action clears user, favourites and local shortcut state. It does not itself remove every persistent browser-cache key. More complete actor-scoped cache ownership and logout cleanup remain part of the cache migration.

File content, previews, thumbnails and mutations continue to pass through authenticated API endpoints. An old visible item in the browser can therefore receive a permission or unavailable-resource response when acted on. The UI still needs to handle that honestly instead of treating the cached item as proof that the resource remains accessible.

## 5. What Happens After a Mutation

When a folder is updated, the file-browser reducer replaces the matching folder in its current course copy and writes updated trees back to session storage.

For a shared folder, the same resource may also appear under another course's cached tree. Updating only the active course's copy does not guarantee that the other copy is refreshed. Similarly, a change made in another tab or by another user is not automatically represented in a previously saved tree.

The server fixes for shared membership, rename and deletion establish correct stored relationships. They do not by themselves replace the frontend's cache policy. The planned query-cache migration will use actor/resource keys, accept valid empty responses and invalidate every affected shared course after a change.

## 6. Debugging a Stale View

If the browser and server appear to disagree:

1. Inspect the actual authenticated course/folder response in the browser's Network panel.
2. Compare it with `sessionStorage.AllCourses` and the loaded Redux tree.
3. If the API response is correct but the UI is old, investigate cache selection and invalidation.
4. If the API denies access, inspect the server's course membership and capabilities; editing local storage is not a permission fix.

Clearing browser storage and reloading can help isolate a cache problem, but it is a diagnostic step rather than a substitute for correct invalidation.

| File                                                                      | Role in the current implementation                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`frontendCache.js`](../client/src/utils/frontendCache.js)                | Read/write the two storage keys and handle basic malformed data.                    |
| [`courseCache.js`](../client/src/utils/courseCache.js)                    | Normalize codes, select duplicate trees and decide whether a cached tree is usable. |
| [`filebrowser_reducer.js`](../client/src/reducers/filebrowser_reducer.js) | Maintain browser navigation/tree copies and persist tree changes.                   |
| [`user_reducer.js`](../client/src/reducers/user_reducer.js)               | Maintain user and shortcut state; update browser shortcuts.                         |
| [`App.jsx`](../client/src/App.jsx)                                        | Load shortcuts and handle the older shortcut-storage adapter.                       |
| [`User.js`](../client/src/api/User.js)                                    | Clear stored course trees during authenticated user bootstrap.                      |
| [`browse/index.jsx`](../client/src/screens/browse/index.jsx)              | Choose cached course data or fetch the course while navigating.                     |

Academic registration caching is a separate server concern. See [Academic Synchronization](academic-synchronization.md) for ordinary versus forced registration refresh.
