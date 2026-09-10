import { useState } from "react";
import { toast } from "../../notifications/toast";
import { getFileDownloadLink } from "../../api/File";
import { transport } from "../../api/http";

export function useFileActions(file, code) {
    const [busy, setBusy] = useState("");
    const download = async () => {
        if (busy) return;
        setBusy("download");
        try {
            const link = await getFileDownloadLink(file._id, code);
            const response = await transport.request(link);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = file.name;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } catch (error) {
            toast.error(error.message || "The file could not be downloaded.");
        } finally {
            setBusy("");
        }
    };
    return { download, busy };
}
