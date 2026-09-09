# Course references and data maintenance

Course name/code edits are administrator operations. IDs remain unchanged. Old course codes become reserved aliases so existing CourseHub bookmarks still resolve after authorization. Deleting a course retires its codes; academic refresh cannot recreate that deleted identity. A shared contribution is reassigned to a remaining course when its former course is deleted.

An edit waits for course locks and refuses unresolved content operations. Finish uploads, linking or cleanup first, then submit the edit again. Recovery uses the MongoDB operation journal, filtered updates and ordered locks. An interrupted edit keeps its course unavailable until the saved operation finishes. The administrator Operations page supports retry. Duplicate populated courses are never merged automatically.

## Inventory and dry-run migration

Run from `server/`, with `MONGO_URI` configured.

```sh
npm run inventory:data -- --database coursehub --report '../~review/inventory.json'
npm run migrate:data -- --database coursehub --report '../~review/migration-plan.json'
```

Inventory reports inconsistent codes, duplicate identities, malformed histories, legacy file/folder fields, ambiguous byte sizes, orphaned content, dangling references and tree errors. It counts retired `userupdates` records without using or deleting them. Migration currently performs one safe additive conversion: copy an old folder `course` into `courses` only when the existing course tree identifies exactly that course and the resulting tree validates. The old field remains available for review.

Other findings require explicit review. Use the administrator course editor for unambiguous code/name changes so all references move together.

## Validated staging/import

The replacement importer accepts a JSON manifest, stages it against the selected database, and reports conflicts before any writes. It creates new trees and skips identical records. Existing records, including empty/populated target structures, are never replaced by import; use the separate course-linking workflow for sharing existing content.

```sh
npm run import:data -- --database coursehub --manifest '../~review/content.json' --report '../~review/import-plan.json'
```

A minimal manifest:

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

Optional `contributions` must refer to an existing student ID, a folder in the stated course and files in that course. Unknown fields, invalid graphs, conflicting IDs/codes and unspecified byte/approval values are rejected. File storage IDs must already exist in the intended storage area.

## Reviewed apply and recovery

Keep the application in maintenance mode while applying a staged import or data migration. Incomplete imported trees must not be exposed while metadata is published. First create a database backup, verify restore on an isolated target, and review the plan and recovery procedure. Record the selected database, the backup archive's SHA-256, and the `planSha256` emitted by dry-run in a local review file:

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

Only after review, explicitly apply the saved plan:

```sh
npm run migrate:data -- --database selected_database --apply-plan '../~review/migration-plan.json' --backup-review '../~review/backup-review.json' --report '../~review/apply-result.json'
# Use import:data with the import plan for staged content.
```

The command verifies the backup file digest, selected database and exact plan, then saves a maintenance journal before effects. It revalidates changed records, serializes maintenance workers, uses ordered course locks and checkpoints each idempotent step. Following interruption, rerun the **same** plan and backup review with a new report path. Completed work is retained. A conflicting document stops the run with locks retained: review/restore that document before resuming.
