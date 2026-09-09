# Shared course trees and linking

Folder and file membership requires a path from a real course root through folders still tagged for that course. The server uses one traversal for authorization, visible trees, removal and linking. Root years and leaf folders follow the same filtering rules as nested branches. Counts come from files visible to the requesting actor.

Removing a shared folder/year unlinks the active course. Other courses keep shared descendants; descendants unique to the removed course go through journaled cleanup. Deleting an individual shared file still removes it for every referencing course, after confirmation names the affected courses. New children inherit the shared parent’s current reachable memberships. Client-submitted descendants never determine cleanup.

## Linking

An administrator submits `POST /api/admin/course/:targetCode/link` with `{ "legacyCode": "SOURCECODE" }`. The response is `202` with `operationId`, `kind: "link"`, `status` and `statusUrl`. Poll the authorized operation endpoint for completion. An explicit administrator link may create a missing target.

The operation’s `linking` result contains source/target codes and `linked`, `alreadyLinked`, `replaced` and `conflicts` arrays. Until completion these describe the saved plan. The linking and Operations screens display the outcomes and preserved conflicts.

- Years match by trimmed, case-insensitive name. Source-only years keep their IDs when linked.
- Only empty target structures may be replaced. Their metadata is detached, not physically deleted, and other course memberships remain intact.
- Every populated matching target year is preserved, including populated duplicates following an empty duplicate. Conflicts identify the skipped year and relevant IDs.
- Multiple source years with the same name are ambiguous and are preserved with a reported conflict.
- Repeating a link preserves existing relationships. It does not restore descendants deliberately unlinked from the target.
- Descendants invisible to the source are not added to the target. Retained target roots keep the memberships they still need.

CSV linking uses the same service. `POST /api/admin/courses/bulk-link` returns `202` with `summary.scheduled`, `summary.failed`, `summary.errors` and `summary.operations`. The browser retains completed rows and conflicts while waiting for other row operations.

## Recovery and tree errors

Linking saves its full plan in MongoDB before changing content. Ordered durable course locks cover connected sharing relationships. Idempotent steps create the target if needed, add memberships, publish target roots and detach replaced memberships. Interrupted work retains its plan and completed steps. Administrators retry it through Operations. Linking does not call storage providers.

The traversal supports 64 folder levels and 10,000 expanded folder/file entries per course, including repeated branches. Creation and linking validate the proposed result before writing content. Cycles, missing references, invalid child types, duplicate normalized course identities, excessive depth and excessive size return explicit `409` errors with `TREE_*` codes. Invalid courses do not block unrelated browsing; mutations involving their sharing component wait for repair.
