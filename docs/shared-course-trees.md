# Shared Course Trees: Server Implementation

The [Course Linking & Shared Folders guide](course_link_logic.md) explains the behavior from a student, BR and administrator perspective. This document follows the same example through the server: `CS101` and `CS1101PH` share a year and some folders, but must still have correct permissions and independent removal behavior.

## 1. How the Server Establishes Membership

A folder tag alone is insufficient to establish access. The server must be able to start at a real course, follow its year/folder references, and reach the resource through folders that still belong to that course.

Consider this structure:

```text
CS1101PH → 2024 → Lectures → Lecture 1.pdf
```

To treat the PDF as part of `CS1101PH`, the server checks the path from the course root. If Lectures has been unlinked from `CS1101PH`, the PDF is not reachable through this path even if an older record elsewhere still mentions that course.

[`folderTrees.js`](../server/services/folderTrees.js) provides the common traversal used by authorization, tree presentation, linking and deletion. A traversal walks the folder references and records which courses can reach each folder and file. Using the same traversal avoids one endpoint deciding that a file is shared while another endpoint treats it as unique.

The resulting tree is then filtered for the requesting actor. A student's file counts exclude other students' pending submissions; the owner and authorized moderators can see the pending content they are allowed to inspect.

## 2. Requesting a Link

An administrator uses this endpoint:

```http
POST /api/admin/course/CS1101PH/link
Content-Type: application/json

{"legacyCode":"CS101"}
```

The URL contains the target; `legacyCode` identifies the source. The field retains its existing API name. Both names are resolved and validated by the server, including course aliases.

A successful scheduling response looks like this:

```json
{
    "operationId": "6eee49ee-7580-4b5f-ad6c-0441adf0139a",
    "kind": "link",
    "status": "queued",
    "statusUrl": "/api/operations/6eee49ee-7580-4b5f-ad6c-0441adf0139a"
}
```

The HTTP status is `202`: the request has been accepted for processing. The browser polls the authenticated status URL until the operation completes or fails. Scheduling may also report `planning` while CourseHub prepares the work.

An explicit administrator link can create a missing target course. Reading a missing course through a GET request cannot create one.

## 3. Understanding the Result

The operation's `linking` field contains `sourceCode`, `targetCode` and four result arrays:

| Field           | Meaning                                                | Example                                                |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `linked`        | Source years to add to the target.                     | Source `2023` has no matching target year.             |
| `alreadyLinked` | The target already uses the source year ID.            | Repeating a previously completed link.                 |
| `replaced`      | Empty target years whose references are replaced.      | An empty target `2024` gives way to the source `2024`. |
| `conflicts`     | Years preserved instead of being automatically linked. | A target `2024` already contains exam papers.          |

Before `status` becomes `completed`, these fields describe the **saved plan**. The UI must wait for completion before claiming those changes were applied. Conflicts remain meaningful after completion: other years can be linked successfully while the conflicting year is left alone.

Year names are compared after trimming whitespace and ignoring case. The planner checks every matching target year and the complete subtree beneath it. Pending files count when deciding whether a target is populated. It also reports ambiguous source years rather than choosing one by array order.

CSV linking calls the same service through `POST /api/admin/courses/bulk-link`. Its `202` response includes `summary.scheduled`, `summary.failed`, `summary.errors` and `summary.operations`. Each scheduled row has its own operation to follow. The browser keeps completed row results visible while the remaining rows finish.

## 4. How a Link Survives an Interruption

[`courseLinking.js`](../server/services/courseLinking.js) builds the exact plan before changing course content. It reserves the related courses using ordered database locks, then saves the plan in the operation journal.

The worker follows these steps:

1. Create the explicitly requested target course if it is missing.
2. Add target membership to the source folders selected by the plan.
3. Publish the target's new list of year references.
4. Remove target membership from the empty structures that were replaced.
5. Mark the operation complete and release its locks.

Each step is safe to repeat. For example, adding a course to a folder uses set membership, so retrying cannot add the same course twice. This repeat-safe behavior is what the implementation calls **idempotency**.

If the process stops after step 2, recovery continues from the saved plan instead of constructing a different plan from the partially changed data. Replaced empty folder records keep their IDs, and other memberships are retained. Linking changes database relationships; it does not move or delete OneDrive files.

A missing planned record is a repair problem. Restore or otherwise review the affected data, then use the administrator retry action. Deleting the operation's locks would allow other writes to interfere with unfinished work.

## 5. Invalid Trees and Concurrent Changes

A normal course is expected to be a finite hierarchy of years, folders and files. The server rejects structures it cannot safely interpret:

- A cycle, such as a folder eventually pointing back to itself.
- A reference to a missing folder or file.
- An invalid child type or conflicting normalized course identity.
- More than 64 folder levels.
- More than 10,000 expanded folder/file entries for one course, including repeated branches.

These conditions return explicit `409` errors with `TREE_*` codes. Folder/year creation and linking also validate the proposed result before content writes, so an otherwise valid tree cannot be extended beyond the supported limits by that request.

Unrelated valid courses remain browsable. Changes involving an invalid shared structure require repair because the server cannot safely calculate their full effect. If sharing changes between the initial read and lock acquisition, the operation rechecks the structure rather than acting on the outdated read.

## 6. Implementation Map

| File                                                            | Responsibility                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`folderTrees.js`](../server/services/folderTrees.js)           | Traverse, validate and calculate reachable memberships.                       |
| [`authorization.js`](../server/services/authorization.js)       | Combine resource membership with the actor's permissions and file visibility. |
| [`contentMutation.js`](../server/services/contentMutation.js)   | Recheck related courses while holding mutation locks.                         |
| [`courseLinking.js`](../server/services/courseLinking.js)       | Plan, schedule and apply course links.                                        |
| [`deletions.js`](../server/services/deletions.js)               | Decide shared unlinking versus unique cleanup.                                |
| [`operationJournal.js`](../server/services/operationJournal.js) | Record completed steps and finish operations.                                 |
