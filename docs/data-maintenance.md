# Course References and Data Maintenance

A course appears in more places than the main course collection. Students have current registrations and semester histories; favourite files carry course context; folders and contributions also refer to courses. Changing the course's name or code therefore needs to update these related records together.

This document first explains normal administrator edits, then the tools for inspecting older data and importing validated content. The inspection tools are useful even when no migration is needed: they show which records are safe to interpret and which need a person's decision.

## 1. Renaming a Course: One Identity, Updated References

Suppose an existing course changes from `CS101 - Introduction to Computing` to `CS1101PH - Programming Fundamentals`.

The administrator edits the course through the Courses page. CourseHub keeps the course's database ID and updates the relevant references:

| Location                    | What changes                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Course record               | Current code and display name.                                                                  |
| Students' current courses   | Matching codes and course names.                                                                |
| Previous semester histories | Matching entries inside each semester's `courses` array.                                        |
| Others                      | Matching browsing shortcuts.                                                                    |
| Favourites                  | Course context and matching course segments in the saved path; the file's own name is retained. |
| Contributions               | The course context associated with the submission.                                              |
| Academic allotments         | Matching registration codes used for permissions.                                               |
| Folders                     | Matching entries in shared course memberships.                                                  |
| Search catalogue            | Updated course naming and availability information.                                             |

A **reference** is one of these stored mentions of the course. Renaming the main record without changing its references could leave a student registered under the old code, or leave a historical BR unable to manage their course.

### Why Semester History Needed Special Handling

History is grouped by semester. A simplified record looks like this:

```json
{
    "previousCourses": [
        {
            "semester": 1,
            "year": 2024,
            "courses": [{ "code": "CS101", "name": "Introduction to Computing" }]
        }
    ]
}
```

The code is inside `previousCourses[].courses[]`. Looking only for `previousCourses[].code` misses it. The reference service updates every matching nested entry, including repeated appearances in different semesters. A malformed older record using the flat shape is reported for review instead of guessed at.

### Old Bookmarks Still Refer to the Same Course

After the rename, `CS101` is kept as a reserved **alias**: an older name for the same course ID. A CourseHub bookmark using that old code can resolve to the current course, with the usual authentication and resource checks.

The old code cannot then be used to create a different course. Academic refresh also resolves the alias, so an upstream registration still using `CS101` does not create a second copy of the course.

Renaming and linking have different purposes. Renaming updates one course's identity and references. [Linking](course_link_logic.md) keeps two course identities and lets them share material. Use linking when both codes should remain separate courses; do not rename one course over another populated course.

## 2. Saving, Failure and Deletion

A course edit may affect many records. The API therefore accepts it as an operation and returns HTTP `202` with an operation ID. The editor waits for completion before closing. If saving fails, it keeps the entered code and name available.

Before changing data, the server saves an exact plan and reserves the affected courses with database locks. Each completed step is recorded in a journal. If the process stops halfway through, retrying the operation continues that saved plan. A partially renamed course stays unavailable while its marked change is unfinished, rather than being served with mixed references.

Existing uploads, linking or cleanup can prevent an edit from starting safely. Finish, cancel or recover those operations as appropriate, then review and submit the edit again. The administrator Operations page shows failed work that can be retried.

Deleting a course removes its references and reserves both its current and old codes as **retired identities**. A later academic refresh skips those identities instead of recreating the deleted course. Shared folders/files still used by other courses survive according to the sharing rules. A contribution whose folder survives under another course keeps its submission ID and is assigned a remaining course context.

## 3. Inventory: Find Problems Without Changing Data

From `server/`, with `MONGO_URI` configured for the intended server:

```sh
npm run inventory:data -- --database coursehub --report '../~review/inventory.json'
```

`--database` explicitly selects the database on that configured connection. `--report` chooses a new local report file. Report paths must contain a `~`-prefixed directory or filename so review artifacts remain separate from application source. Commands refuse to overwrite an existing report.

Inventory reads the database and writes the report. It does not migrate documents, create application indexes, contact storage providers or delete collections.

The findings explain problems such as:

| Finding             | Example                                                                           | Why it needs attention                                                                |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Duplicate identity  | `CS101` and `cs 101` normalize to the same course code but have different IDs.    | Automatically choosing one could discard the other course's content.                  |
| Malformed history   | A course appears directly inside `previousCourses`, without its semester wrapper. | The intended historical structure needs review.                                       |
| Missing reference   | A folder points to a file ID that does not exist.                                 | The server cannot safely traverse the complete tree.                                  |
| Legacy membership   | A folder has `course` instead of the current `courses` array.                     | Its memberships need to be established from the real course tree.                     |
| Ambiguous file size | A file has `size: "1024"` but no `sizeBytes`.                                     | The older field does not establish the unit reliably enough for automatic conversion. |

The report also identifies inconsistent codes, orphaned resources, legacy file fields and invalid tree structures. It counts old `userupdates` tracking records, but those records no longer determine authentication or synchronization.

A finding is a request to inspect the data, not permission to delete it. Course IDs, populated duplicate years and uncertain byte counts must be preserved until there is enough evidence for an explicit correction.

## 4. Dry-Run Migration: Propose Only a Safe Conversion

To generate a migration plan:

```sh
npm run migrate:data -- --database coursehub --report '../~review/migration-plan.json'
```

A **dry run** calculates proposed changes and saves them for inspection without applying them to the database.

The current migration supports one additive conversion. Consider an old folder containing:

```json
{ "course": "CS101" }
```

If the actual course tree establishes exactly that membership and the proposed tree validates, the plan can add:

```json
{ "course": "CS101", "courses": ["CS101"] }
```

The folder ID and the old field remain intact. The conversion is skipped when membership is ambiguous, the course cannot be identified uniquely, or the resulting tree is invalid. Already-converted records need no additional step on a later dry run.

This command does not automatically normalize every record, merge duplicate courses or infer file byte sizes. Its report can therefore have unresolved findings and zero proposed steps. That means none of the detected issues qualifies for this particular automatic conversion. Use the normal course editor for reviewed renames; inspect storage/fixture evidence for exact legacy file sizes.

## 5. Staging a Content Import

The content importer takes a JSON **manifest**: a file describing the courses, folders and existing storage files to add. Staging validates that description against the selected database and produces a saved plan.

```sh
npm run import:data -- --database coursehub --manifest '../~review/content.json' --report '../~review/import-plan.json'
```

For example, this manifest describes one course, one year and one pending PDF:

```json
{
    "version": 1,
    "courses": [
        {
            "_id": "507f1f77bcf86cd799439101",
            "code": "CS901",
            "name": "Imported course",
            "children": ["507f1f77bcf86cd799439102"]
        }
    ],
    "folders": [
        {
            "_id": "507f1f77bcf86cd799439102",
            "name": "2025",
            "courses": ["CS901"],
            "childType": "File",
            "children": ["507f1f77bcf86cd799439103"]
        }
    ],
    "files": [
        {
            "_id": "507f1f77bcf86cd799439103",
            "name": "Notes.pdf",
            "fileId": "reviewed-onedrive-item-id",
            "size": "1024",
            "sizeBytes": 1024,
            "isVerified": false
        }
    ]
}
```

The `children` values connect the three explicit database IDs. `fileId` identifies an already-stored OneDrive item; it is not the MongoDB file ID. Replace the example IDs and storage identifier with reviewed values for the intended import.

The explicit `sizeBytes` records the known number of bytes. `isVerified: false` keeps the file pending. Optional `contributions` must identify an existing student, a parent folder in the stated course and files belonging to that course.

Staging checks the relationships, supported fields, normalized course codes, explicit file size/approval and identity conflicts. Its behavior is:

- New valid records become proposed insert steps.
- Existing identical records are skipped.
- An existing record with different content is reported as a conflict.
- Existing populated courses and their years are never replaced by this importer.

Resolve all import conflicts before applying. Use course linking to share existing content or replace eligible empty target structures. Staging does not upload files or verify live provider access; storage delivery still needs acceptance in the selected test area.

## 6. Applying a Reviewed Plan

Applying changes is a separate, explicit action. Before using it, inspect the plan, create a database backup, test restoration on an isolated target, and record the reviewed recovery procedure.

The application needs a maintenance window during apply so users and normal workers do not observe or modify a partially published import. The CLI does not turn on a website maintenance mode for you; arrange that operationally before running it.

A local backup review file has this structure:

```json
{
    "database": "selected_database",
    "path": "/absolute/path/to/reviewed-backup.archive",
    "sha256": "actual-backup-file-sha256",
    "planSha256": "exact-plan-digest-from-dry-run",
    "reviewed": true,
    "recoveryProcedure": "Reviewed restore command, isolated restore evidence, and the operator responsible for recovery."
}
```

A SHA-256 digest is a fingerprint of a file's contents. The backup digest lets the command check that the archive has not changed. `planSha256`, emitted in the dry-run report, ties the review to the exact proposed plan. The placeholders above must be replaced with real review information; setting `reviewed` does not perform a restore rehearsal.

After review, apply a migration plan using:

```sh
npm run migrate:data -- --database selected_database --apply-plan '../~review/migration-plan.json' --backup-review '../~review/backup-review.json' --report '../~review/apply-result.json'
```

For a staged content import, use `npm run import:data` with the same flags and the saved import plan. A plan is bound to its selected database. A plan for `coursehub` cannot be applied to a differently named database by simply changing the CLI argument.

## 7. Resuming After an Interruption

Apply saves a maintenance journal before its data writes. It records the plan, backup review and completed steps. Each write either inserts a planned identity or checks that the existing record still matches the expected state.

If the process stops after a write but before recording that step, a retry recognizes the intended existing value and continues. It does not create a new ID or duplicate the resource.

To resume, run the **same plan and backup review** with a new report path. If a document has changed unexpectedly, execution stops for review and retains the unfinished run's course locks. Restore or review the conflicting record before resuming. Removing the locks to force progress would defeat the protection against conflicting changes.

The tools live in [`maintainData.js`](../server/scripts/maintainData.js) and [`dataMaintenance.js`](../server/services/dataMaintenance.js). Normal rename/deletion reference updates live in [`courseReferences.js`](../server/services/courseReferences.js). The older destructive rebuild, duplicate-merging and reverse-folder scripts have been removed; these commands replace their maintenance role without silently replacing existing content.
