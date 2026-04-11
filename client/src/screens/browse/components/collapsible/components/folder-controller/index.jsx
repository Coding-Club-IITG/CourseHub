import Folder from "../folder";

const FolderController = ({ folders }) => {
	if (!Array.isArray(folders) || folders.length === 0) return null;
	return folders.map((folder) => <Folder folder={folder} key={folder._id} />);
};

export default FolderController;
