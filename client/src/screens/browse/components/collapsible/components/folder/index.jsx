import { useState } from "react";
import FolderController from "../folder-controller";

import "./styles.scss";

import { useDispatch, useSelector } from "react-redux";

import { ChangeFolder } from "../../../../../../actions/filebrowser_actions";
import { useEffect } from "react";

const Folder = ({ folder, state }) => {
    const dispatch = useDispatch();
    const _state = useSelector((state) => state.fileBrowser);
    const [open, setOpen] = useState(state ? state : false);
    const [lastFolder, setLastFolder] = useState(false);

    const closeFolder = () => {
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
                        </span>
                        <span
                            className={`${
                                folder.childType !== "File" ? "triangle" : ""
                            }`}
                            onClick={() => closeFolder()}
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
