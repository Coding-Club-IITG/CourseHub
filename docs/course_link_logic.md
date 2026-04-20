# Course Linking & Shared Folders Logic

This document outlines the architecture, logic, and behavior of the Course Linking feature, which allows merging legacy course content (e.g., `CS101`) into new course codes (e.g., `CS1101PH`) without duplicating data.

## 1. Core Architecture: The "Shared Folders" Model (Tagging)
To ensure data integrity and prevent duplication, the system uses a **"Many-to-Many" Tagging Model** for folders.

*   **Schema Update:** The `FolderModel` no longer has a single `course` string. It now has a `courses: [String]` array.
*   **Behavior:** A single folder document (and its OneDrive equivalent) can belong to multiple courses simultaneously.
*   **Result:** When a legacy course is linked to a new course, the legacy course's folders simply add the new course code to their `courses` array. No folders or files are physically moved or duplicated.

## 2. Linking Logic: The "Smart Merge"
When linking a source course (Legacy) to a target course (New), the system must handle the fact that new courses are automatically "bootstrapped" with 5 empty years (each containing empty `Lectures`, `Assignments`, `Exams`, etc.).

### Step-by-Step Merge Process:
1.  **Iterate Years:** The system iterates through each top-level "Year" folder in the Legacy course (e.g., "2024", "2023").
2.  **Check for Existence:** For each Legacy year, it checks if the New course already has a folder with that exact name.
3.  **Handle Missing Years:** If the New course is missing that year entirely (e.g., "2021"), the system simply links the entire Legacy year folder structure to the New course.
4.  **Handle Collisions (The "Deep Empty Check"):** If both courses have a "2024" folder (due to bootstrapping), the system performs a recursive check on the New course's year folder.
    *   **What is "Empty"?** A year is considered empty ONLY if there are absolutely **zero files** anywhere inside it or its sub-folders. Bootstrapped structures (nested folders with 0 files) are classified as "empty".
5.  **The Decision:**
    *   **If the New course's year IS empty:** The system recursively deletes/unlinks the empty bootstrapped folders from the New course. It then replaces them by linking the Legacy course's year folder (adding the New course code to its `courses` array).
    *   **If the New course's year HAS files:** The system assumes the New course is actively using this year. To prevent data loss, it **skips** linking this specific year entirely. The New course's unique content is preserved, and the Legacy content for that year remains unlinked.

## 3. Deletion Logic: Safe Unlinking (Option B)
Because folders are shared, deletion must be handled carefully to prevent one course from accidentally destroying another course's data.

### Folder Deletion (Safe Unlinking)
When a Branch Representative (BR) deletes a folder (e.g., a specific "Assignments" folder) from within a course:
1.  **Check References:** The system checks the folder's `courses` array.
2.  **Shared Folders:** If the folder is shared (e.g., used by `CS101` and `CS1101PH`), the system **DOES NOT** delete the folder from the database. Instead, it recursively removes the requesting course's code from the `courses` array of that folder and all its descendants. 
    *   *Result:* The folder disappears from the requesting course's view (filtered out by the API) but remains perfectly intact for the other courses.
3.  **Unique Folders:** If the folder is only used by the requesting course (e.g., `courses` array only contains `["CS1101PH"]`), the system permanently deletes the folder and all its contents from the database and OneDrive.

### File Deletion (True Deletion)
Files inside shared folders act as a collaborative space.
*   If a BR deletes an individual file (e.g., `lecture1.pdf`) from inside a shared folder, that file is **permanently deleted** from the database and OneDrive for everyone.
*   *Why?* Because the file physically resides in a single, shared folder. If you share a folder, you share its contents.

## 4. Client-Side Rendering
To support shared folders, the client UI (specifically `BrowseFolder`, `FolderInfo`, and the file upload `Contributions` modal) dynamically determines its context.
*   Instead of relying strictly on `folder.course` (which is now an array), the UI prioritizes the **Active Course Context** (`currCourseCode` in Redux).
*   This ensures that if a BR from `CS1101PH` is viewing a shared folder, they still have the correct upload and management permissions for their course context.
