import { session } from "../../../../session/runtime";
import { useSession } from "../../../../session/context";
import { toast } from "react-toastify";
import { updateUser } from "../../../../api/User";
import { useState } from "react";
import Container from "../../../../components/container";
import formatName from "../../../../utils/formatName";
import formatBranch from "../../../../utils/formatBranch";
import SemCard from "./SemCard/index";
import "react-toastify/dist/ReactToastify.css";
import "./styles.scss";

const FrontBanner = () => {
    const [isNameEdit, setIsNameEdit] = useState(false);
    const user = useSession().data;
    const [userName, setUserName] = useState(formatName(user?.name));
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    function editNameHandler() {
        setUserName(user.name);
        setSaveError("");
        setIsNameEdit(true);
    }
    async function submitNameHandler() {
        if (saving) return;
        if (!userName.trim()) {
            setSaveError("Name cannot be empty.");
            return;
        }
        setSaving(true);
        setSaveError("");
        try {
            const data = await updateUser({ newUserName: userName.trim() });
            session.setActor((current) => ({ ...current, name: data.name }));
            setIsNameEdit(false);
            toast.success("Profile updated");
        } catch (error) {
            setSaveError(error.message || "Could not save your name. Please try again.");
        } finally {
            setSaving(false);
        }
    }
    return (
        <Container color={"dark"}>
            <div className="front_banner">
                <div className="banner_text">
                    <div className="texts">
                        <div className="sub_head">
                            <span>MY PROFILE</span>
                        </div>
                        <header>
                            {isNameEdit ? (
                                <input
                                    autoFocus
                                    id="nameField"
                                    aria-label="Name"
                                    aria-describedby={saveError ? "profile-save-error" : undefined}
                                    aria-invalid={!!saveError}
                                    maxLength={120}
                                    disabled={saving}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") submitNameHandler();
                                    }}
                                    className="inputName"
                                    value={userName}
                                    onChange={(event) => {
                                        setUserName(() => {
                                            return event.target.value;
                                        });
                                    }}
                                    type="text"
                                />
                            ) : (
                                formatName(user?.name)
                            )}
                            {isNameEdit ? (
                                <button
                                    type="button"
                                    aria-label="Save name"
                                    className="tickDiv"
                                    disabled={saving}
                                    onClick={submitNameHandler}
                                />
                            ) : (
                                <button
                                    type="button"
                                    aria-label="Edit name"
                                    className="editDiv"
                                    onClick={editNameHandler}
                                />
                            )}
                        </header>
                        {saving && <p role="status">Saving…</p>}
                        {saveError && (
                            <p id="profile-save-error" className="profile-save-error" role="alert">
                                {saveError}
                            </p>
                        )}
                        <div className="branch">{formatBranch(user?.degree, user?.department)}</div>
                    </div>

                    <SemCard sem={user.semester} />
                </div>
            </div>
        </Container>
    );
};
export default FrontBanner;
