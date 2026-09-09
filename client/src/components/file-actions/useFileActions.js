import { useState } from "react";
import { toast } from "react-toastify";
import { previewFile, getFileDownloadLink } from "../../api/File";
import { transport } from "../../api/http";

export function useFileActions(file, code) {
    const [busy, setBusy] = useState("");
    const preview = async () => {
        if (busy) return;
        const tab = window.open("about:blank", "_blank");
        if (!tab) {
            toast.error("Allow pop-ups to open the file preview.");
            return;
        }
        tab.opener = null;
        setBusy("preview");
        try {
            const { url } = await previewFile(file._id, code);
            if (!tab.closed) tab.location.replace(url);
        } catch (error) {
            tab.close();
            toast.error(error.message || "The file preview is unavailable.");
        } finally {
            setBusy("");
        }
    };
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
    return { preview, download, busy };
}
