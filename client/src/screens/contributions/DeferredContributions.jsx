import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, LoadingState } from "@coursehub/ui";
import { useUploadDialog } from "./dialogContext";

const Contributions = lazy(() => import("./index"));

export default function DeferredContributions() {
    const { open, setOpen, returnFocusRef } = useUploadDialog();
    const [params] = useSearchParams();
    const requested = !!params.get("upload");
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (open || requested) setLoaded(true);
    }, [open, requested]);
    // Keep the mounted upload state when closing the dialog
    if (!loaded && !open && !requested) return null;
    return (
        <Suspense
            fallback={
                <Dialog
                    open={open}
                    onOpenChange={setOpen}
                    returnFocusRef={returnFocusRef}
                    title="Upload files"
                >
                    <LoadingState title="Loading uploader…" />
                </Dialog>
            }
        >
            <Contributions />
        </Suspense>
    );
}
