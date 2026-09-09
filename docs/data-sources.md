# CourseHub data sources and manual maintenance

CourseHub gets its data from several places: the academic portal, Microsoft login, local files, administrator decisions, and student contributions. This guide explains which inputs update automatically and which ones you need to maintain.

The main distinction is that **academic registrations are scraped, while course names and exam timetables are separately maintained data**. Microsoft supplies account details and file access through APIs. People provide the library material and admins decide BRs.

For example, synchronization can discover that a student takes a new course and add that code to CourseHub. If the title lookup has no entry, it will appear as **Name Unavailable**. If the exam timetable has no slot mapping for it, its exam dates will also be unavailable.

| Information                                     | Automatic source or manual input?        | Normal maintenance                                              |
| ----------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Registered course codes                         | Academic portal scraper                  | Automatic refreshes or admin force refresh.                     |
| Course names                                    | Local lookup files and saved admin edits | Supply missing or corrected titles.                             |
| Exam slots, dates and times                     | Reviewed server timetable files          | Provide each new period and any corrections.                    |
| BR roster                                       | Admin-managed email registry             | Add/remove representatives as membership changes.               |
| Student profiles                                | Microsoft Graph on first login           | Users maintain permitted profile edits afterwards.              |
| Library files and organization                  | Contributions and management actions     | Upload, organize, moderate and explicitly link shared material. |
| Search, counts, countdowns and operation status | Derived from the above records           | No separate data feed to populate.                              |

## 1. Academic registrations

[`academicPortal.js`](../server/services/academicPortal.js) posts the selected year/session and `cid=All` to IITG's academic registration endpoint. It parses an HTML table containing roll numbers and course codes. The parser normalizes/deduplicates codes and retains the existing exclusion for codes containing `SA`.

You normally do not need to download and hand-enter each student's allocation. The following entry points drive the same worker:

| Trigger                                                             | What happens                                                                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| First login, expired refresh age or a new academic period           | Ordinary synchronization for that student; valid cached data can be reused.                                                                  |
| Profile: Refresh registered courses                                 | Ordinary synchronization for the signed-in student. This is not a guaranteed new upstream fetch.                                             |
| Administrator refresh of one student                                | Forced refresh of current registrations and, for an authoritative BR, applicable history.                                                    |
| Assigning a BR who already has a user account                       | Ordinary synchronization is queued for that person, including applicable history.                                                            |
| Administrator Refresh all courses                                   | Forced refresh of the current academic period, including allotments for roll numbers in the upstream response and updates to existing users. |
| Scheduled job                                                       | Queues the same current-period refresh at midnight on the first day of each month.                                                           |
| `npm run sync-cache -- --database selected_database` from `server/` | Explicitly queues the same job. A running API worker on that database must execute it.                                                       |

See [Academic Course Synchronization](academic-synchronization.md) for the complete flow.

## 2. Course names and the course catalogue

The Course collection is the application's working catalogue: course IDs, codes, names and attached library trees. It can grow automatically when trusted academic synchronization discovers a valid unknown code. The new course's name comes from local lookup data:

1. [`list.json`](../server/modules/course/list.json) is the first lookup.
2. [`course.list.js`](../server/modules/course/course.list.js) supplies additional existing course-code coverage.
3. The fallback is `Name Unavailable`.

[`getCourseTitle`](../server/utils/course.js) implements that lookup. Neither source file has an automatic updating job in this repository. Their original collection method does not make them a live data feed.

Administrators can create/import courses with `code,name` and edit existing course names through Courses. The import updates existing names through the course-reference operation service. Normal academic sync preserves an existing stored course name, so changing a local lookup file alone is not a bulk repair for already-created records. Correct existing records through the administrator workflow as well as maintaining lookup data where needed.

You only need to maintain new/corrected catalogue entries. A course created by academic sync starts without library content.

## 3. Exam schedules

Exam data is currently held in a source file. [`july-nov-2026.js`](../server/data/examSchedules/july-nov-2026.js) is an example.

Two separate inputs are required:

- A mapping from each applicable course code to its exam slot.
- The Mid-Sem and End-Sem date/time windows for each slot.

Obtain the approved timetable for the next period, add a corresponding server data file and register it in [`examSchedule.js`](../server/services/examSchedule.js).

The server then automatically combines that timetable with the student's current allotment and current stored course names.

See [Exam Schedules](exam-schedules.md) for more info.

## 4. History, academic periods and semester numbers

Individual BR synchronization obtains historical registrations from the same academic source for applicable periods since admission. Ordinary historical refreshes can reuse saved allotments. The all-student monthly refresh updates the current period and retains existing history.

The current period and semester number are calculated from the admission year encoded in the roll number. The configured boundaries are January 1–July 23 for `Jan-May`, and July 24–December 31 for `July-Nov`. These are application rules in [`academicPeriod.js`](../server/services/academicPeriod.js). Changed institutional rules or roll-number conventions require a reviewed code/rule update.

A student's manually edited display semester does not supply registered-course permissions.

## 5. BRs and administrators

The authoritative BR registry is a list of email addresses maintained through administrator add/remove/bulk actions. Entries may be added before a student's first login.

Administrator accounts are provisioned deliberately using `npm run admin` from `server/`, with explicit credentials. See [Authentication](authentication.md).

## 6. Student profiles

The first successful institute login obtains profile values from Microsoft Graph: display name, email, roll number from the institute account's surname field and degree from its job-title field. Department comes from the existing roll-code mapping for supported B.Tech branches, otherwise the Graph profile. Semester is calculated locally.

These values create the local User record. Subsequent login does not resynchronize every saved profile field. Name/display-semester edits are saved through Profile.

## 7. Library content, sharing and moderation

| Data                                                  | How it is supplied or maintained                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Years and folders                                     | Authorized BR/admin actions. Creating a year builds the standard Exams/Lectures/Assignments/Resources structure.                    |
| PDFs, notes, past papers and other files              | Students/BRs/admins select and upload the actual files through CourseHub. The upload worker creates provider and database metadata. |
| Approval decisions                                    | Authorized BRs/admins moderate submissions.                                                                                         |
| Shared course relationships                           | Administrators choose which courses to link, individually or through the existing linking import.                                   |
| Existing OneDrive material not represented in MongoDB | Needs an explicitly reviewed content manifest/import.                                                                               |
| Favourites and Others                                 | Saved user actions.                                                                                                                 |

MongoDB stores identities, relationships, contributor and moderation information. OneDrive stores the bytes.

See [Data Maintenance](data-maintenance.md) and [Course Linking](course_link_logic.md).

## 8. Practical semester checklist

1. **Check the course catalogue for additions and corrections.** Supply missing names and make deliberate changes through the supported administrator workflows.
2. **Force-refresh current registrations after registration data is available.** Check completion and sample student records. Repeat after add/drop corrections where needed.
3. **Update the BR roster.** Use individual force refreshes where historical registrations need correction.
4. **Provide and review the new exam timetable.** Include course-slot mappings and both exam windows, register its period file.
5. **Organize and contribute content.** Create needed year/folder structures, upload material, moderate it and explicitly link courses that should share resources.
