# Course linking and shared folders

Course roots and folder IDs are preserved. Folders carry course membership in `courses`; the server resolves the authoritative graph before access or mutation. File membership is derived from that graph. A client-supplied course code is context to validate, never authority.

Administrator linking creates a journaled operation. Missing target years share the source IDs. A target year can be replaced only when its complete subtree is empty. Populated duplicate years are preserved and reported as conflicts. Repeated linking is idempotent. Cycles, dangling references and excessive depth stop planning before side effects.

Removing a shared folder/year unlinks the requesting course. Unique descendants are cleaned up through the deletion journal. Deleting an individual shared file affects every referencing course and requires an explicit affected-course confirmation. New descendants inherit shared membership on the server. The configured storage root cannot be deleted automatically.

See [course reference maintenance](./data-maintenance.md) and [academic synchronization](./academic-synchronization.md) for inventory, recovery and refresh behavior.
