import { useCourseBrowser } from "../../../../../../queries/browserContext";
import { useState } from "react";
import FolderController from "../folder-controller";

import styles from "./styles.module.scss";

import { useEffect } from "react";
import { getSubtreeFileCount } from "../../../../../../utils/folderUtils";

import { useNavigate } from "react-router-dom";

const Folder = ({ folder, state }) => {
    const navigate = useNavigate();
    const _state = useCourseBrowser();
    const [open, setOpen] = useState(state ? state : false);
    const fileCount = getSubtreeFileCount(folder);

    const closeFolder = (e) => {
        e.stopPropagation();
        setOpen(false);
    };

    const onClick = (folderData) => {
        setOpen(true);
        if (_state.currentCourseCode && folderData?._id) {
            navigate(`/browse/${_state.currentCourseCode}/${folderData._id}`);
        }
    };

    useEffect(() => {
        if (_state?.currentFolder?._id === folder._id) {
            setOpen(true);
        }
    }, [_state.currentFolder?._id, folder._id]);

    return (
        <div className={`${styles.root} main-folder ${open}`}>
            <div className="folder-vertical-line">
                <span className="up"></span>
                <span className="down"></span>
            </div>
            <div className="main-content">
                <div className="folder">
                    <div className="horizontal-line"></div>
                    <div
                        className={`text-content ${
                            folder._id === _state?.currentFolder?._id ? "current" : ""
                        }`}
                    >
                        <button
                            type="button"
                            className={`text ${folder.childType === "File" && "nobold"}`}
                            onClick={() => onClick(folder)}
                        >
                            {folder.name}
                            <span className="tree-file-count">({fileCount})</span>
                        </button>
                        {folder.childType !== "File" && (
                            <button
                                type="button"
                                aria-label={`Collapse ${folder.name}`}
                                className={`${folder.childType !== "File" ? "triangle" : ""}`}
                                onClick={closeFolder}
                            ></button>
                        )}
                    </div>
                </div>
                <div className="children">
                    {folder.childType === "Folder" && (
                        <FolderController folders={folder.children} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Folder;
