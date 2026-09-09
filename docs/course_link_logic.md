# Course Linking & Shared Folders Logic

Course linking lets two course codes use the same learning material without copying the folders or uploading the files again. This is useful when a course receives a new code but its older lectures, assignments and exam papers are still relevant.

For example, suppose `CS101` contains several years of material and students now register for `CS1101PH`. An administrator can link material from `CS101` into `CS1101PH`. Students browsing either course can then reach the shared folders. Both courses keep their own identities, and the original folder and file IDs stay the same.

This document explains what a link means, how CourseHub handles existing material, and what happens when someone removes shared content. For the corresponding API requests and server implementation, see [Shared Course Trees: Server Implementation](shared-course-trees.md).

## 1. How a Folder Can Belong to Two Courses

A course stores references to its top-level year folders. Each folder has a `courses` array that identifies the courses it belongs to. A simplified example is:

```json
{
    "_id": "shared-lectures-folder",
    "name": "Lectures",
    "courses": ["CS101", "CS1101PH"],
    "childType": "File",
    "children": ["lecture-file-1", "lecture-file-2"]
}
```

There is **one Lectures folder**, referenced by two courses. Likewise, `lecture-file-1` is one file, even if students can find it through both course pages. The IDs above are explanatory labels; actual database records use MongoDB IDs.

The visible structure might look like this:

```text
CS101 ─────┐
           ├── 2024 [same year folder]
CS1101PH ──┘      └── Lectures [same folder]
                       └── Lecture 1.pdf [same file]
```

This has a practical consequence: renaming a shared folder or file changes the name seen through both courses. Uploading into a folder shared by both courses also makes the new content part of that shared structure. Normal approval and visibility rules still apply.

## 2. What Happens When an Administrator Links Courses

The administrator chooses a **source course**, which has the material to reuse, and a **target course**, where that material should also appear. In our example, the source is `CS101` and the target is `CS1101PH`.

CourseHub compares the visible top-level years by name. It ignores surrounding spaces and differences in letter case when comparing names. It then considers each source year separately:

1. **Read the existing structures.** The server loads both courses and their folders from the database. It does not rely on a folder tree supplied by the browser.
2. **Find target years with the same name.** A source year named `2024` is compared with every target year named `2024`.
3. **Inspect the complete target subtree.** A year is empty only when there are no files anywhere underneath it. A year containing empty Lectures, Exams and Assignments folders is still empty. A pending, unapproved file counts as content too.
4. **Choose a result for that year.** The table below explains the possible outcomes.
5. **Save and execute the plan.** CourseHub records the intended changes, performs them, and reports which years were linked or preserved.

| Existing target structure                             | What CourseHub does                                                                                                                                       | What the administrator sees                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| No matching year                                      | Adds a reference to the source year and gives its reachable folders the target membership.                                                                | The year is linked.                                              |
| A matching year whose complete subtree is empty       | Replaces the target's reference with the source year. The old empty folder records are detached from this course; their IDs are not destroyed by linking. | The empty target year is replaced and the source year is linked. |
| A matching year with files anywhere beneath it        | Keeps the target year and its content. It skips linking that source year.                                                                                 | A conflict explaining that the populated target was preserved.   |
| The target already references the same source year ID | Keeps the existing link.                                                                                                                                  | The year is already linked.                                      |
| Several source years have the same name               | Preserves them and skips choosing one automatically.                                                                                                      | A conflict explaining that the source year is ambiguous.         |

### Example: Only Some Years Can Be Linked

Suppose the source has `2023` and `2024`. The target has no `2023`, but its own `2024` already contains a new assignment.

After linking:

- The target gains the source's shared `2023` folder.
- The target keeps its own `2024` and the assignment inside it.
- The source's `2024` remains available through the source course.
- The result reports a successful link for `2023` and a preserved conflict for `2024`.

A completed operation can therefore contain conflicts. “Completed” means the saved plan finished; it does not mean every source year was linked.

### Why Checking Every Duplicate Matters

Older data can contain two target folders both called `2024`. If the first is empty and the second contains exam papers, checking only the first could wrongly conclude that the target year is safe to replace.

CourseHub checks **all matching target years**. A populated duplicate is preserved even if an empty duplicate appears first. This was one of the main corrections in the linking implementation.

## 3. Removing a Shared Folder or Year

Removing a folder from a course means removing that course's access through that part of the tree. The active course matters.

Suppose a BR is browsing `CS1101PH` and removes the shared `2024` year:

1. The browser sends the year ID and the active course code.
2. The server checks that the BR can manage that course and that the year actually belongs to it.
3. Shared folders lose the `CS1101PH` membership where appropriate.
4. `CS101` retains the folders and files it still uses.
5. Descendants used only by the removed course go through the recoverable deletion process.

**Result:** the year disappears from `CS1101PH`, while the material still shared with `CS101` remains available there. Removing a nested shared folder follows the same rule. Leaf folders and top-level years are filtered consistently, so a folder does not remain visible merely because it has no child folders.

A subtree can contain both shared and unique descendants. CourseHub decides what remains shared for each resource instead of treating every descendant as if it belonged to exactly the same courses.

## 4. Deleting an Individual Shared File

An individual file has one stored identity. Deleting that file removes it for every course that uses it.

For example, if `Lecture 1.pdf` appears in both `CS101` and `CS1101PH`, deleting that PDF from either course removes the shared file. Before confirmation, CourseHub names the affected courses so the person performing the action can see its full effect.

Folder/year removal and file deletion therefore have different outcomes:

| Action                                                | Effect on another linked course                         |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Remove a shared folder or year from the active course | The other course keeps the content it still references. |
| Delete an individual shared file                      | The file is removed from the other course as well.      |
| Rename a shared folder or file                        | The other course sees the same new name.                |

The storage cleanup process deletes individual provider files when appropriate. It never automatically deletes CourseHub's configured OneDrive root. See [Storage, Uploads and Cleanup](storage-operations.md) for failure and retry behavior.

## 5. Repeating a Link or Adding New Content

Repeating the same link does not create another copy of the year or duplicate its IDs.

It also does not silently reverse deliberate unlinking. If someone previously removed a nested folder from the target course, repeating a link to an already-shared year does not automatically share that nested folder again.

For newly created folders, the server calculates membership from the parent's current reachable courses. Creating a child inside a folder still shared by both example courses gives that child the appropriate shared membership. The browser cannot grant extra memberships by submitting a larger `courses` array.

## 6. Progress, Failure and Permissions

Linking can involve many folders, so accepting the request and finishing the work are separate events. CourseHub first creates an operation that can be viewed on the administrator **Operations** page.

The operation has a saved checklist in MongoDB, called an **operation journal**. If the API stops after adding some memberships, the next worker can use that checklist to finish the remaining steps. Related courses are locked against conflicting changes while the saved work needs to finish. Here, a lock is a database record reserving those courses for that operation.

An administrator can retry failed work through Operations. Retrying the saved operation preserves already-completed steps. If a planned record is missing or the tree is malformed, CourseHub reports the problem rather than declaring success.

Linking is an administrator action. BRs manage only their current and historical registered courses, according to the server's academic allotments and BR registry. Adding a course under **Others**, editing browser state, or choosing a different course code in a request does not grant management rights.

The frontend keeps track of which course the person is browsing so it can display the correct controls and warnings. The server independently checks that context on every protected action.
