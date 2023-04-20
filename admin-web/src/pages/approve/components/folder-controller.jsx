import React from "react";
import Folder from "./folder";
const FolderController = ({ folders, setSelectedFolder }) => {
  return (
    <div>
      {folders &&
        folders.map((f) => {
          return <Folder folder={f} setSelectedFolder={setSelectedFolder} />;
        })}
    </div>
  );
};

export default FolderController;
