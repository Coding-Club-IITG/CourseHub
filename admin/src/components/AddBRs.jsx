import { useId, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Dialog, FormField } from "@coursehub/ui";
import { isEmail, normalizeEmail } from "@coursehub/domain";
import { createBR } from "../apis/br";
import ImportDialog from "./imports/ImportDialog";
import styles from "@/styles/layout.module.scss";
export default function AddBRs({ onSuccess, onClose }) {
    const location = useLocation();
    const [bulk, setBulk] = useState(() => new URLSearchParams(location.search).has("import"));
    const [email, setEmail] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [success, setSuccess] = useState("");
    const form = useId();
    const submit = async (event) => {
        event.preventDefault();
        if (busy) return;
        setError("");
        setSuccess("");
        const value = normalizeEmail(email);
        if (!isEmail(value)) {
            setError("Enter a valid email address.");
            return;
        }
        setBusy(true);
        try {
            const result = await createBR(value);
            setSuccess(
                `BR access saved for ${result.br?.email || value}.${result.synchronization ? " Course synchronization is scheduled; review it in Operations." : ""}`,
            );
            setEmail("");
            onSuccess?.();
        } catch (failure) {
            setError(failure.message || "BR access could not be saved.");
        } finally {
            setBusy(false);
        }
    };
    if (bulk) return <ImportDialog type="brs" onClose={onClose} onSuccess={onSuccess} />;
    return (
        <Dialog
            bodyClassName={styles.stack}
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Add Branch Representatives"
            description="Assign BR access by email. People who have not signed in appear as pending registrations."
            busy={busy}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Close
                    </Button>
                    <Button type="submit" form={form} busy={busy}>
                        Add BR
                    </Button>
                </>
            }
        >
            <div className={styles.toolbar}>
                <Button aria-pressed>Single BR</Button>
                <Button variant="secondary" onClick={() => setBulk(true)} disabled={busy}>
                    Bulk Upload
                </Button>
            </div>
            <form id={form} onSubmit={submit} className={styles.stack}>
                <FormField label="Email address" required error={error}>
                    <input
                        type="email"
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={busy}
                    />
                </FormField>
                {success && (
                    <p role="status" className={styles.successText}>
                        {success}
                    </p>
                )}
            </form>
        </Dialog>
    );
}
