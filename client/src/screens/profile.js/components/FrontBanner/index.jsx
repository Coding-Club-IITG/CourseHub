import { useRef, useState } from "react";
import { Button, FormField, IconButton } from "@coursehub/ui";
import { session } from "../../../../session/runtime";
import { useSession } from "../../../../session/context";
import { updateUser } from "../../../../api/User";
import Container from "../../../../components/container";
import formatName from "../../../../utils/formatName";
import formatBranch from "../../../../utils/formatBranch";
import SemCard from "./SemCard";
import styles from "./styles.module.scss";
export default function FrontBanner() {
    const user = useSession().data,
        trigger = useRef(null);
    const [editing, setEditing] = useState(false),
        [name, setName] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [saved, setSaved] = useState(false);
    const cancel = () => {
        setEditing(false);
        requestAnimationFrame(() => trigger.current?.focus());
    };
    const save = async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!name.trim()) {
            setError("Name cannot be empty.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const result = await updateUser({ newUserName: name.trim() });
            session.setActor((current) => ({ ...current, name: result.name }));
            cancel();
            setSaved(true);
        } catch (failure) {
            setError(failure.message || "Could not save your name. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Container color="dark" className={styles.section}>
            <div className={styles.banner}>
                <div className={styles.text}>
                    <h1>MY PROFILE</h1>
                    {editing ? (
                        <form
                            className={styles.form}
                            onSubmit={save}
                            onKeyDown={(event) => {
                                if (event.key === "Escape" && !busy) cancel();
                            }}
                        >
                            <FormField label="Name" error={error}>
                                <input
                                    autoFocus
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    maxLength={120}
                                    disabled={busy}
                                />
                            </FormField>
                            <div className={styles.actions}>
                                <Button
                                    type="submit"
                                    aria-label="Save name"
                                    busy={busy}
                                    busyLabel="Saving…"
                                >
                                    Save name
                                </Button>
                                <Button variant="ghost" disabled={busy} onClick={cancel}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className={styles.name}>
                            <h2>{formatName(user.name)}</h2>
                            <IconButton
                                ref={trigger}
                                label="Edit name"
                                variant="ghost"
                                onClick={() => {
                                    setName(user.name);
                                    setError("");
                                    setSaved(false);
                                    setEditing(true);
                                }}
                            >
                                <img
                                    src={new URL("./Assets/editL.svg", import.meta.url).href}
                                    alt=""
                                    width="24"
                                    height="24"
                                />
                            </IconButton>
                        </div>
                    )}
                    {saved && <p role="status">Profile updated</p>}
                    <p className={styles.branch}>{formatBranch(user.degree, user.department)}</p>
                </div>
                <SemCard sem={user.semester} />
            </div>
        </Container>
    );
}
