import { useState } from "react";
import FolderController from "../folder-controller";

import "./styles.scss";

import { useDispatch, useSelector } from "react-redux";

import { ChangeFolder } from "../../../../../../actions/filebrowser_actions";
import { useEffect } from "react";
import { getSubtreeFileCount } from "../../../../../../utils/folderUtils";

const Folder = ({ folder, state }) => {
    const dispatch = useDispatch();
    const _state = useSelector((state) => state.fileBrowser);
    const [open, setOpen] = useState(state ? state : false);
    const fileCount = getSubtreeFileCount(folder);

    const closeFolder = (e) => {
        e.stopPropagation();
        setOpen(false);
    };

    const onClick = (folderData) => {
        dispatch(ChangeFolder(folderData));
        setOpen(true);
    };

    useEffect(() => {
        if (!open && _state?.currentFolder?._id === folder._id) {
            setOpen(true);
        }
    }, [_state.currentFolder]);

    return (
        <div className={`main-folder ${open}`}>
            <div className="folder-vertical-line">
                <span className="up"></span>
                <span className="down"></span>
            </div>
            <div className="main-content">
                <div className="folder">
                    <div className="horizontal-line"></div>
                    <div
                        className={`text-content ${
                            folder._id === _state?.currentFolder?._id
                                ? "current"
                                : ""
                        }`}
                    >
                        <span
                            className={`text ${
                                folder.childType === "File" && "nobold"
                            }`}
                            onClick={() => onClick(folder)}
                        >
                            {folder.name}
                            <span className="tree-file-count">({fileCount === 0 ? "Empty" : fileCount})</span>
                        </span>
                        <span
                            className={`${
                                folder.childType !== "File" ? "triangle" : ""
                            }`}
                            onClick={closeFolder}
                        ></span>
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
