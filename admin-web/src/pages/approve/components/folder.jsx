import React from "react";
import FolderController from "../components/folder-controller";
const Folder = ({ folder, setSelectedFolder }) => {
  return (
    <div className="ms-5">
      <p
        className={`h6 ${
          folder.childType === "File" ? "btn btn-light" : "text-decoration-underline"
        }`}
        onClick={() => {
          setSelectedFolder(folder);
        }}
      >
        {folder.name}
      </p>
      {folder && folder.childType === "Folder" ? (
        <FolderController folders={folder.children} setSelectedFolder={setSelectedFolder} />
      ) : (
        ""
        // <ul>
        //   {folder.children.map((file) => (
        //     <li>{file.name}</li>
        //   ))}
        // </ul>
      )}
    </div>
  );
};

export default Folder;
