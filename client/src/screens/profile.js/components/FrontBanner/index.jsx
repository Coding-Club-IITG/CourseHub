import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { updateUser } from "../../../../api/User";
import { UpdateUserAction } from "../../../../actions/user_actions";
import { useState } from "react";
import Container from "../../../../components/container";
import formatName from "../../../../utils/formatName";
import formatBranch from "../../../../utils/formatBranch";
import SemCard from "./SemCard/index";
import "react-toastify/dist/ReactToastify.css";
import "./styles.scss";

const FrontBanner = () => {
    const dispatch = useDispatch();
    const [isNameEdit, setIsNameEdit] = useState(false);
    const user = useSelector((state) => state.user);
    const [userName, setUserName] = useState(formatName(user?.user?.name));

    function editNameHandler(newName) {
        setIsNameEdit(true);
    }
    async function submitNameHandler() {
        const newUserData = {
            newUserName: userName,
        };
        if (!userName) {
            toast.error("Username cannot be empty", {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            return;
        }
        setIsNameEdit((prev) => !prev);
        dispatch(UpdateUserAction(newUserData));
        toast.success("Succesfully Updated", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
        });
        const resp = await updateUser(newUserData);
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
                                    autofocus="autofocus"
                                    id="nameField"
                                    className="inputName"
                                    value={userName}
                                    onChange={(event) => {
                                        setUserName((prev) => {
                                            return event.target.value;
                                        });
                                    }}
                                    type="text"
                                />
                            ) : (
                                formatName(user?.user?.name)
                            )}
                            {isNameEdit ? (
                                <div className="tickDiv" onClick={submitNameHandler} />
                            ) : (
                                <div className="editDiv" onClick={editNameHandler} />
                            )}
                        </header>
                        <div className="branch">
                            {formatBranch(user?.user?.degree, user?.user?.department)}
                        </div>
                    </div>

                    <SemCard sem={user.user.semester} />
                </div>
            </div>
        </Container>
    );
};
export default FrontBanner;
