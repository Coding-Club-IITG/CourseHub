# Academic Course Synchronization

CourseHub needs to know which courses a student is actually registered for. That information comes from IITG's academic registration data. **Synchronization** means reading that data, validating it, and updating CourseHub's saved registration lists.

For example, a student's new semester might contain `CS201` and `MA201` while CourseHub still shows the previous semester's courses. A successful refresh updates their current list. For a BR, CourseHub also needs historical registrations because BRs retain management access to their registered courses from earlier semesters.

Login, BR assignment, profile refresh, administrator refresh and the monthly job now use the same synchronization service. This keeps them from disagreeing about course codes, semester history or whether a refresh has actually finished.

## 1. The Different Course Lists

Several lists mention courses, but they serve different purposes:

| Data                | What it represents                                                                 | How it is used                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Academic allotments | The server's saved registration data for a roll number, year and academic session. | Establishes registered-course permissions.                                                  |
| Current courses     | The current courses shown on the student's profile/dashboard.                      | Gives the student their normal course list.                                                 |
| Previous courses    | Courses grouped into earlier semesters.                                            | Displays saved history; BR synchronization fills the applicable historical periods.         |
| Others              | Courses the student added for convenient browsing.                                 | Provides shortcuts without granting BR management or registered-course contribution rights. |
| BR registry         | The authoritative list of BR email addresses.                                      | Establishes whether the student has BR privileges at all.                                   |

A student cannot make themselves a BR by changing a profile field or a browser-side course list. The server combines the BR registry with academic allotments when deciding what they can manage.

## 2. Ordinary Refresh and Force Refresh

CourseHub keeps validated copies of academic data in MongoDB so every login does not need a separate request to the academic portal. This saved copy is the **cache**.

An ordinary refresh is allowed to reuse suitable cached data. A force refresh must obtain data fetched after that refresh request was queued. If another concurrent request has already obtained that fresh snapshot, both requests can use it.

| Entry point                                      | Who can use it?                   | What it refreshes                                                                     | Cache behavior                              |
| ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Login when refresh is due                        | Signing-in student                | Current courses; historical courses when the student is an authoritative BR.          | Ordinary refresh.                           |
| Profile: **Refresh registered courses**          | Signed-in student                 | Their own current courses and applicable BR history.                                  | Ordinary refresh.                           |
| Assign a BR                                      | Administrator                     | Queues ordinary synchronization for the matching registered student.                  | Reuses suitable saved allotments/snapshots. |
| Refresh one student in admin                     | Administrator                     | That student's current courses and, if they are a BR, applicable history.             | Force refresh.                              |
| **Refresh all courses**, monthly job or sync CLI | Administrator or server scheduler | Current-period registrations for all students. Existing semester history is retained. | Force refresh for the current period.       |

### Example: A Registration Was Corrected Today

Suppose CourseHub fetched a student's registrations this morning. The academic office adds `CS205` later that day.

The student's ordinary profile refresh may still use this morning's valid cache. An administrator's force refresh requests newer upstream data, so it can pick up `CS205`. This is why the administrator action does more than simply clearing a flag that says the student has been refreshed.

The cache lifetime for current data is configured with `ACADEMIC_CACHE_SECONDS`. Its default is `86400`, or 24 hours; the supported range is 60 to 2592000 seconds. Ordinary BR refreshes can reuse saved historical allotments without applying the current-period expiry rule. A forced individual BR refresh checks the applicable historical periods too.

## 3. What the Service Does, Step by Step

1. **Identify the student and academic period.** The self-service endpoint takes its identity from the session. The server calculates the period when the worker executes the job.
2. **Check the BR registry.** A saved `isBR` display flag is not enough to decide whether history should be synchronized.
3. **Collect all required periods.** A regular student needs the current period. An individual BR refresh also collects the historical periods since admission.
4. **Validate upstream results.** The response must contain the expected academic table and complete, valid rows. A login page, incomplete response or malformed roll/course value is an error, not an empty registration list.
5. **Resolve CourseHub identities.** Renamed course codes are translated to their current identities. Retired codes are skipped. Unknown, valid academic courses can be created through this trusted service.
6. **Save an exact update plan.** The plan includes new IDs and the intended allotment/user updates. Database locks protect the reference changes from competing course edits.
7. **Persist the changes.** New courses and academic allotments are saved before the corresponding user updates and success metadata. BR history is grouped by semester; Others entries already covered by registered courses are removed as duplicates.
8. **Report completion.** The operation becomes `completed` only after its saved steps finish.

The persisted plan and completed-step checklist form an **operation journal**. If the API process stops during database writes, the worker resumes that plan after restart. This is recovery by completing saved work, rather than an automatic rollback of every earlier write.

## 4. Empty Data Is Different From Failed Data

A valid academic response can say that a student has no courses for a period. For example, a newly admitted BR may have no earlier semesters to load. That is a legitimate result and must not force the student to log in repeatedly.

A portal error is different. If the portal is unavailable or its response cannot be validated, CourseHub keeps the last successful course data. It does not replace those courses with an empty array just because a request failed.

The portal also includes identities such as `X260100001`. The source snapshot preserves that full identifier separately from `260100001`. CourseHub currently assigns registrations only to its supported 9-digit account rolls - a bulk refresh does not strip the prefix or transfer those registrations to another account. Malformed identifiers still invalidate the response. This distinction lets ordinary registrations refresh without confusing distinct institute identities.

The student refresh screen reflects this distinction:

- While work is running, it explains that courses are being refreshed and offers **Continue with saved courses**.
- If refresh fails, it offers **Try again** while keeping the saved-course option.
- After successful persistence, it reloads the saved user data and returns to the requested destination.

Missing synchronization metadata also does not invalidate an authenticated session. A valid direct link to `/profile?tab=courses#history` can remain on that page even when its courses are due for refresh.

## 5. Choosing the Academic Period

All period calculations use the `Asia/Kolkata` calendar. The current implementation uses these boundaries:

| India calendar date         | Academic session label  |
| --------------------------- | ----------------------- |
| January 1 through July 23   | `Jan-May` of that year  |
| July 24 through December 31 | `July-Nov` of that year |

These are the application's period-selection boundaries, not an assertion that classes run throughout every included month. The session labels match those used for academic queries.

For a student admitted in 2024, history starts with `July-Nov` 2024. In `July-Nov` 2026, an individual BR refresh considers that first period, the intervening periods, and the current one. A job queued before a boundary but executed afterwards selects the period at execution time; it does not rely on a date calculated once when the server started.

## 6. API and Operation Status

| Request                                | Purpose                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST /api/user/synchronize` with `{}` | Ordinary refresh for the authenticated student. Supplied roll numbers, user IDs and force flags are rejected. |
| `PUT /api/student/refresh/:id`         | Administrator force refresh for one student.                                                                  |
| `POST /api/admin/sync-courses-cache`   | Administrator force refresh for all current registrations.                                                    |
| `GET /api/operations/:id`              | Inspect an authorized operation's progress or failure.                                                        |

Scheduling returns HTTP `202` with `operationId`, `kind: "academic-sync"`, `status` and `statusUrl`. The browser polls the status URL. A student can inspect a refresh concerning their own record, including one started by an administrator; forced jobs can only be retried by an administrator.

`GET /api/user` includes a `synchronization` object with the current period, last successful save, operation reference, state and whether refresh is due. That is refresh information, separate from whether the login session is valid.

## 7. Scheduled Work and Troubleshooting

The scheduler queues a forced current-period refresh at midnight on the first day of each month in India time. To intentionally queue the same work from `server/`:

```sh
npm run sync-cache -- --database selected_database
```

An API worker connected to that database must be running to execute the queued operation. Running the command alone does not finish a refresh.

Academic and content operations use separate worker lanes: a slow academic request does not occupy the upload worker. Their database reference writes still coordinate through course locks. Concurrent requests share saved operations or period snapshots where appropriate.

If an operation remains queued, check that its worker is running and whether a conflicting course operation is holding a lock. If it fails with a provider error, restore academic access and retry. If it reports ambiguous identities or malformed history, use the [data inventory](data-maintenance.md) to review those records rather than clearing the student's courses.

Implementation starts in [`academicSync.js`](../server/services/academicSync.js), with period calculation in [`academicPeriod.js`](../server/services/academicPeriod.js) and portal validation/cache access in [`academicPortal.js`](../server/services/academicPortal.js).
