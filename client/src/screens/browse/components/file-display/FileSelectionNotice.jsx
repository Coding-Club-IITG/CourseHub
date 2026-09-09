import { useSearchParams } from "react-router-dom";
import { useCourseBrowser } from "../../../../queries/browserContext";
export default function FileSelectionNotice() {
    const [params, setParams] = useSearchParams();
    const { currentFolder, refresh } = useCourseBrowser();
    const id = params.get("file");
    if (!id) return null;
    const file =
        currentFolder?.childType === "File" &&
        currentFolder.children.find((item) => item._id === id);
    if (file) return null;
    const clear = () => {
        const next = new URLSearchParams(params);
        next.delete("file");
        setParams(next, { replace: true });
    };
    return (
        <div className="unavailable-file-state" role="alert">
            <div>
                <h3>File unavailable</h3>
                <p>This file was removed or you do not have access to it.</p>
            </div>
            <div className="file-state-actions">
                <button type="button" className="retry" onClick={refresh}>
                    Try again
                </button>
                <button type="button" className="dismiss" onClick={clear}>
                    Clear selection
                </button>
            </div>
        </div>
    );
}
