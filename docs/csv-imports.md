# Course and BR CSV imports

Use **Courses → Add Courses** to maintain course titles, or **Students → BRs Only → Add BRs → Bulk Upload** to assign representatives. Both flows preview the file before any changes.

## Preparing a file

Course files need exactly `code` and `name` headers. BR files need exactly `email`. Headers can appear in either order for courses and are compared without surrounding whitespace or case. Keep a file within **1 MiB and 1,000 data rows**, including repeated rows. Course names can contain up to 200 characters, email addresses up to 254.

For example:

```csv
code,name
CS101,"Computing, examples and applications"
MA101,"Analysis and
worked proofs"
```

The second name includes a newline. Put commas, newlines and quotes inside quoted fields. Represent a quote inside a quoted field by doubling it. It keeps names as text and normalizes course codes using the shared CourseHub rule. Email addresses are trimmed and lowercased.

```csv
email
representative@example.test
"SECOND.REPRESENTATIVE@EXAMPLE.TEST"
```

Malformed quoting, missing columns, invalid codes or emails, empty names and overlong fields must be corrected before submission. Errors identify CSV record numbers.

Identical repeated codes or emails are marked to skip. Two rows that give the same normalized course code different names are a conflict, rather than a last-row-wins update. The preview also identifies reserved course identities, duplicate stored identities and courses with unfinished changes. Resolve those conflicts before importing.

## Reviewing changes

The server compares every supplied row with saved data, independently of the visible list page. New courses are created. Existing courses with changed titles go through the course-reference operation, which preserves IDs, aliases and saved user references. Matching titles are skipped. BR imports create missing registry assignments and skip existing ones.

Review the old and new course names before selecting **Confirm import**. The preview is bound to the data it compared. A failed preview can be retried with the selected rows.

A BR result confirms the assignment was saved. If that person has a student profile, the existing academic service schedules registration synchronization separately. A person who has not signed in can still receive a registry assignment and appears as a pending registration.

## Progress, interruption and retry

Confirmation returns an operation ID. The MongoDB journal, processed by the existing content worker, owns execution after that point. The dialog shows created, updated, skipped and failed results in a bounded list.

You can close the dialog or browser while an accepted import runs. Open it again from **Operations → Open import**, or keep its URL containing `?import=OPERATION_ID`. That URL restores the saved operation, including successful and failed rows, after authentication. Closing the dialog does not cancel accepted work.

If some rows fail, **Retry unfinished rows** keeps successful rows and retries the failed ones. A course update resumes its existing child reference operation, including saved steps and locks. New records have identities assigned before their first write, so recovery after a write cannot create a second copy. Conflicts caused by a later manual edit can require review of that edit or a newly prepared import.

If the submission response is lost, repeat the same reviewed submission. Its actor-scoped request ID and validated fingerprint return the same saved operation. A fresh preview supplies a new request ID, so a later deliberate import can reassign a BR who was removed after an earlier import. Submitting the same file through a fresh preview after completion is also safe: data that already matches is skipped. A changed file represents a new requested import.

## API and maintenance

The authenticated administrator endpoints are:

1. `POST /api/admin/imports/preview` with `{ "type": "courses", "rows": [{ "row": 2, "code": "CS101", "name": "Computing" }] }` (or `type: "brs"` with email rows).
2. `POST /api/admin/imports` with the same type/rows and the returned digest as `previewDigest` and the returned `requestId`. A `202` response means accepted, not completed.
3. `GET /api/operations/:id` for status and `import.rows`, `import.counts`, `import.total` and `import.finished`.
4. `POST /api/operations/:id/retry` only when the returned capability allows it.

The implementation uses [Papa Parse's quoting and parsing contracts](https://www.papaparse.com/docs). Shared rules live in `packages/domain/src/imports.js`, authoritative comparison and execution live in `server/services/imports.js`.
