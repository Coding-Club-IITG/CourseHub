# Frontend Caching (Client)

This document outlines how course data is cached in the client application to improve performance and reduce redundant API calls. All course cache reads and writes are centralized through the `client/src/utils/frontendCache.js` utility.

## Cache Keys and Payloads

### 1. `AllCourses` (Stored in `sessionStorage`)
- **What is cached:** An array of full "Course Tree" objects. Each object contains the course metadata (like `code` and `name`) and a deeply nested `children` array representing the entire folder and file structure for that course (e.g., Years -> Folders like "Midsem" -> Files like PDFs). 
- **Example Data:**
  ```json
  [
    {
      "_id": "course_id_123",
      "code": "CS101",
      "name": "Intro to Computer Science",
      "childType": "Folder",
      "children": [
        {
          "_id": "year_id_2023",
          "name": "2023",
          "childType": "Folder",
          "children": [
            {
              "_id": "folder_id_midsem",
              "name": "Midsem",
              "childType": "File",
              "children": [
                {
                  "_id": "file_id_pdf1",
                  "name": "Midsem_2023_Solutions.pdf",
                  "fileType": "application/pdf",
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
- **Why it's cached:** When a user browses a course, the server returns the full folder structure. Caching this prevents re-fetching the folder tree when the user switches between courses or navigates through the sidebar.
- **Sanitization Rule:** If multiple trees exist for the same course code, the cache utility automatically keeps the "largest" tree (the one with the most items in its `children` array) to ensure no data is lost.
- **Written by:** `filebrowser_reducer` (whenever a folder or file is updated/verified) via `writeAllCoursesCache`.
- **Read by:** App startup, Dashboard, and Browse screens via `readAllCoursesCache` to instantly render the sidebar and folder views.
- **Lifetime:** Cleared when the browser tab/session is closed, or manually cleared if the data becomes corrupted.

### 2. `LocalCourses` (Stored in `localStorage`)
- **What is cached:** An array of simple course objects (typically just `code` and `name`, without the deep nested file structures). These are custom courses the user has manually added to their dashboard.
- **Example Data:**
  ```json
  [
    {
      "code": "CS101",
      "name": "Intro to Computer Science",
      "color": "#6F8FFE"
    },
    {
      "code": "MA201",
      "name": "Linear Algebra",
      "color": "#FECF6F"
    }
  ]
  ```
- **Why it's cached:** To remember the user's custom added courses across different browser sessions and tabs, so their dashboard remains intact even after a page reload.
- **Sanitization Rule:** Deduplicates courses by their `code` (e.g., "cs101" and "CS 101" are treated as the same course).
- **Written by:** `user_reducer` (when a user clicks "Add Course") via `upsertLocalCourseCache`.
- **Read by:** `App.jsx` during initial startup via `readLocalCoursesCache` to populate the user's dashboard.
- **Lifetime:** Persists across browser sessions until the user manually logs out or clears their browser data.

---

## Utility Function Map

The `frontendCache.js` module provides safe access to these storage keys. It automatically handles `JSON.parse` errors and data sanitization.

| File | Cache utility functions used | Purpose |
| --- | --- | --- |
| `client/src/App.jsx` | `migrateLegacyLocalCoursesFromSession`, `readLocalCoursesCache` | Migrates legacy session data and loads the user's saved custom courses on startup. |
| `client/src/reducers/filebrowser_reducer.js` | `writeAllCoursesCache` | Saves the updated nested folder structure back to the session cache when the user navigates or modifies files. |
| `client/src/reducers/user_reducer.js` | `upsertLocalCourseCache` | Adds a newly selected course to the local storage so it appears on the dashboard permanently. |
| `client/src/screens/browse/index.jsx` | `readAllCoursesCache`, `clearAllCoursesCache` | Fetches the cached folder structure to display the course files. Clears the cache if corrupted. |
| `client/src/screens/browse/components/collapsible/index.jsx` | `readAllCoursesCache` | Uses the cached course tree to rapidly render the expandable sidebar navigation. |
| `client/src/screens/dashboard/index.jsx` | `clearLegacySessionLocalCoursesCache`, `readAllCoursesCache` | Clears old migration data and fast-loads the cached folder trees for display. |
| `client/src/screens/landing/index.jsx` | `clearLegacySessionLocalCoursesCache` | Cleans up legacy migration data on the login screen. |