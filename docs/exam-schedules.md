# Exam schedules and countdowns

A countdown means the number of calendar days until the next listed exam for the student's current registered courses. A countdown card is shown only while that exam type has an upcoming or ongoing exam.

For example, suppose a student is registered for `RT5022` in slot G and `BM5101H` in slot A. In the July-November 2026 timetable, their Mid-Sem exams start on 13 and 14 September respectively. On 9 September, the dashboard shows **4 Days for Mid-Sem Exam**, and the first timetable card shows **13 Sept 2026, 09:00-11:00**. After that exam finishes, the countdown moves to the next exam in the student's list. Once both Mid-Sem exams finish, that countdown card disappears. The End-Sem countdown remains until its own listed exams finish.

## 1. Where the information comes from

An authenticated request to `GET /api/event/examdates` produces the complete dashboard result.

The student's saved course arrays, previous semesters and manually added Others courses do not determine this schedule. Nor can a caller choose another student or semester by adding query parameters. If current allotment data is missing, the dashboard explains that course registrations are unavailable and directs the student to refresh their courses from Profile.

An empty allotment is different: it is a successful academic response containing no registered courses, so there are no applicable exams.

## 2. The timetable and course-slot rules

Each timetable declares its academic period. Within it, `courseSlotMap` maps a normalized course code to a slot, and `slotSchedule` provides that slot's Mid-Sem and End-Sem windows. For example:

```js
{
    period: { year: 2026, session: "July-Nov" },
    courseSlotMap: { RT5022: "G" },
    slotSchedule: {
        G: {
            midSem: { date: "13-09-2026", time: "9:00-11:00" },
            endSem: { date: "14-11-2026", time: "9:00-12:00" },
        },
    },
}
```

Codes use the shared course normalization rule. Duplicate registrations result in one card for a course.

Missing information is never interpreted as a confirmed absence of an exam:

| Timetable entry                                                   | Meaning                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| A course maps to a slot with a valid exam window                  | Show that course's exam.                                |
| A course has no mapping, or its slot/window is missing or invalid | The exam date is unavailable.                           |
| A course explicitly maps to `null`                                | The timetable explicitly states that it has no exams.   |
| A mapped slot has `midSem: null` or `endSem: null`                | There is explicitly no exam of that type for that slot. |

## 3. What the dashboard shows

The countdown points to the first listed exam that has not finished. Timetable cards are sorted by start time, with course code breaking ties. Courses with the same start time share that next-exam date. The normal caption is **Days for** (or **Day for** when one day remains).

An unmapped course does not suppress the countdown for other courses with valid exam dates. For example, a student's registration can include lab courses without entries in the maintained timetable.

| Situation                                       | Summary and timetable behavior                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Complete schedule with an upcoming exam         | Show the calendar-day countdown and dated course cards.                                |
| Exam later today                                | Show **Today**, rather than a zero that could be confused with missing data.           |
| Exam has started but has not ended              | Show **Now**, and mark its timetable card **In progress**.                             |
| Some registered courses have no confirmed dates | Count down to the next listed exam and retain known timetable cards.                   |
| No listed upcoming or ongoing exam of one type  | Hide that countdown card, independently of the other exam type.                        |
| Timetable or current registrations unavailable  | Hide countdowns; explain the unavailable data in the timetable section.                |
| Empty registrations or explicitly no exams      | Hide countdowns; retain the no-exam illustration in the timetable section.             |
| Every listed exam has finished                  | Hide countdowns; retain dated timetable cards marked **Finished**.                     |
| Initial request still loading or has failed     | Hide countdowns; keep loading/error states and failure retry in the timetable section. |

Mid-Sem and End-Sem remain separate views of the same response. The toggle controls are keyboard-operable buttons, and switching between them does not make another request.

## 4. Midnight and semester rollover

Countdowns count calendar days, not completed 24-hour intervals. At 23:59, an exam the next morning is one day away; at midnight it becomes **Today**. An exam is **In progress** from its start time until its end time. At its exact end time, the next applicable exam becomes the summary target.

The dashboard refreshes at least once a minute while active, with a shorter interval near midnight or the next start/end boundary. The server recalculates the academic period on every request. Returning to the dashboard or refocusing the browser also revalidates the query.

A July-November timetable is never carried into January-May merely because no replacement has been added. After rollover, the new period must have both an academic allotment and a matching timetable. Otherwise the interface shows unavailable data.

## 5. Providing or correcting a timetable

Timetables are reviewed server data. To provide the next academic period:

1. Obtain the approved course-slot mappings and exam windows for that period.
2. Add a period-specific data file under `server/data/examSchedules/`, following the existing structure. Use the service's `Jan-May` or `July-Nov` period labels and the actual calendar year.
3. Register the file in the `schedules` list in [`server/services/examSchedule.js`](../server/services/examSchedule.js). Keep one timetable per period.
4. Check missing mappings, deliberate no-exam entries, dates and time windows against the approved timetable.
5. Review the data change and release the API.

## 6. API and deployment details

A successful response includes `status`, `period`, `timeZone`, `generatedAt`, `refreshAfterMs` and `exams`. The top-level status is `ready`, `excluded` or `unavailable`. For a ready response, `exams.midSem` and `exams.endSem` each contain their own status, `items`, `missingCourses` and `nextExam`. `nextExam` is the first upcoming or ongoing listed exam, including for a `partial` schedule. It is `null` when no such exam exists.

Unavailable or excluded schedule data is a valid `200` response describing the current state. Missing authentication returns `401`. A database failure uses the shared safe error response, and the UI offers retry. The response is private and must not be cached by an intermediary.

## 7. Relevant code

| File                                                                                                                                  | Responsibility                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`server/services/examSchedule.js`](../server/services/examSchedule.js)                                                               | Select the period and registered courses, validate windows, calculate the list and summaries. |
| [`server/data/examSchedules/july-nov-2026.js`](../server/data/examSchedules/july-nov-2026.js)                                         | Preserve the supplied 2026 course mappings and exam windows.                                  |
| [`client/src/queries/exams.js`](../client/src/queries/exams.js)                                                                       | Own the actor-scoped schedule request and revalidation.                                       |
| [`client/src/screens/dashboard/components/examcard/index.jsx`](../client/src/screens/dashboard/components/examcard/index.jsx)         | Display the server's next listed countdown, Today or Now.                                     |
| [`client/src/screens/dashboard/components/examschedule/index.jsx`](../client/src/screens/dashboard/components/examschedule/index.jsx) | Display the course timetable, missing-data explanations and retries.                          |
