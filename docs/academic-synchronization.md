# Academic synchronization

Login, BR assignment, student refresh, administrator force refresh and the monthly scheduler use one journaled service. The current academic period is calculated when a job executes: January–May through July 23, July–November from July 24. Historical semesters start with the admission year's July session. BR status comes from the registry, and permissions come from saved academic allotments.

- `POST /api/user/synchronize` accepts an empty object and operates on the authenticated student only. It uses fresh cached allotments or validated period snapshots; it cannot force upstream refresh.
- `PUT /api/student/refresh/:id` lets an administrator refresh that student's current registrations and, for an authoritative BR, history from upstream.
- `POST /api/admin/sync-courses-cache` schedules a forced current-period refresh for all students. It replaces the former destructive semester reset.
- Both responses return `202`, `operationId`, `kind` and `statusUrl`. Poll `GET /api/operations/:id`; `completed` means persistence finished. A student can inspect a refresh concerning their own record, including one started by an administrator. Forced jobs can only be retried by an administrator.

The profile's **Refresh registered courses** link opens the self-service flow. It offers retry on failure and lets the student continue with saved courses while refresh runs. `/api/user` includes `synchronization` state, last success, current period, operation ID and whether refresh is due.

`ACADEMIC_CACHE_SECONDS` defaults to 86400. Concurrent requests share a saved operation/snapshot. Invalid HTML, incomplete rows and provider outages preserve the last successful data. All required upstream periods are collected and validated before course/user/allotment writes begin. The user success timestamp is written only after the allotments persist. A database interruption resumes the exact saved plan. Refresh resolves renamed course aliases and skips retired identities, so upstream codes cannot undo reviewed course changes.

Academic and content workers have separate bounded lanes. Slow portal requests do not occupy the upload worker; reference writes still coordinate through ordered course/identity locks. New courses are created only through explicit administration, validated import or this trusted synchronization service. No public course GET creates content.

The scheduler queues one forced current-period operation at midnight on the first day of each month. To queue the same job manually, from `server/`:

```sh
npm run sync-cache -- --database selected_database
```

An API operation worker using that database must be running to execute the queued job. Inspect and retry failures through the administrator Operations page.
