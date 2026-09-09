import { useState } from "react";
import server from "../../api/server";
import { formatFileType } from "../../utils/formatFile";
export default function FileThumbnail({ file }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="file-thumbnail" aria-hidden="true">
            <span>{formatFileType(file.name).toUpperCase() || "FILE"}</span>
            {file.thumbnail?.url && !failed && (
                <img
                    src={
                        new URL(`/api/files/thumbnail/${encodeURIComponent(file._id)}`, server).href
                    }
                    alt=""
                    onError={() => setFailed(true)}
                />
            )}
        </div>
    );
}
