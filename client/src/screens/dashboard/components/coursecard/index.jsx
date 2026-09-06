import formatLongText from "../../../../utils/formatLongText";
import { capitalise } from "../../../../utils/capitalise";
import "./styles.scss";
import { useEffect, useState } from "react";
import { IsCourseAvailable } from "../../../../api/Search";
import { DeleteCourseAPI } from "../../../../api/User";
import { toast } from "react-toastify";
import { ConfirmDialog } from "./ConfirmDialog";
const CourseCard = ({ code, color, name, type, setClicked, isReadOnly, onCourseRemoved }) => {
    const [isAvailable, setIsAvailable] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        async function SetCourseAvailability() {
            try {
                setIsAvailable(true);
            } catch (error) {
                setIsAvailable(false);
            }
        }
        SetCourseAvailability();
    }, []);

    const handleRemove = async () => {
        if (isRemoving) return;
        try {
            setIsRemoving(true);
            await DeleteCourseAPI(code);
            setIsRemoving(false);
            setShowConfirm(false);
            if (onCourseRemoved) {
                onCourseRemoved(code);
            } else {
                location.reload();
            }
        } catch (error) {
            toast.error("Something went wrong!");
            setIsRemoving(false);
            setShowConfirm(false);
        }
    };

    const cancelRemove = () => {
        if (isRemoving) return;
        setShowConfirm(false);
    };

    return type === "ADD" ? (
        <div className="coursecard ADD" onClick={setClicked}>
            <div className="content">
                <i className="fa fa-xl fa-plus" aria-hidden="true"></i>
                <p>Add Course</p>
            </div>
        </div>
    ) : (
        <>
            <div
                className={`coursecard ${isAvailable}`}
                style={{ backgroundColor: color }}
            >
                {isReadOnly && (
                    <span
                        className="remove-course"
                        onClick={() => {
                            setShowConfirm(true);
                        }}
                    ></span>
                )}

                <div className="card-content" onClick={isAvailable ? setClicked : () => {}}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <p className="code">{code ? code : "code"}</p>
                        {!isAvailable && <p className="unavailable">UNAVAILABLE</p>}
                    </div>
                    <div className="name">
                        <p>{name ? formatLongText(capitalise(name), 39) : "Name Unavailable"}</p>
                    </div>
                </div>
            </div>
            {showConfirm && (
                <ConfirmDialog
                    isOpen={showConfirm}
                    type="delete"
                    onConfirm={handleRemove}
                    onCancel={cancelRemove}
                    isLoading={isRemoving}
                />
            )}
        </>
    );
};

export default CourseCard;
