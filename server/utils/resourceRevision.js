import { createHash } from "node:crypto";

// Hash only the authorized presentation. Hidden file metadata must not enter this digest.
export function withRevision(resource) {
    if (!resource) return resource;
    const { revision: _revision, ...data } = resource;
    return { ...data, revision: createHash("sha256").update(JSON.stringify(data)).digest("hex") };
}
