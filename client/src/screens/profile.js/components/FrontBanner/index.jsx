import { useRef, useState } from "react";
import { IconButton } from "@coursehub/ui";
import { session } from "../../../../session/runtime";
import { useSession } from "../../../../session/context";
import { updateUser } from "../../../../api/User";
import { InlineRename } from "../../../../components/content-dialogs";
import Container from "../../../../components/container";
import formatName from "../../../../utils/formatName";
import formatBranch from "../../../../utils/formatBranch";
import SemCard from "./SemCard";
import styles from "./styles.module.scss";
export default function FrontBanner() {
    const user = useSession().data,
        trigger = useRef(null);
    const [editing, setEditing] = useState(false),
        [saved, setSaved] = useState(false);
    const cancel = () => {
        setEditing(false);
        requestAnimationFrame(() => trigger.current?.focus());
    };
    const save = async (name) => {
        const result = await updateUser({ newUserName: name });
        session.setActor((current) => ({ ...current, name: result.name }));
        setSaved(true);
    };
    return (
        <Container color="dark" className={styles.section}>
            <div className={styles.banner}>
                <div className={styles.text}>
                    <h1>MY PROFILE</h1>
                    {editing ? (
                        <InlineRename
                            className={styles.form}
                            label="Name"
                            initialName={user.name}
                            maxLength={120}
                            onSave={save}
                            onCancel={cancel}
                        />
                    ) : (
                        <div className={styles.name}>
                            <h2>{formatName(user.name)}</h2>
                            <IconButton
                                size="sm"
                                ref={trigger}
                                label="Edit name"
                                variant="ghost"
                                onClick={() => {
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
