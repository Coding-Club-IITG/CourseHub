import File from "../file/";
import FileDisplay from "../../../file-display";
import { useSelector } from "react-redux";

const FileController = ({ files, code, isMobileView = false }) => {
    const user = useSelector((state) => state.user.user);

    if (!files) return null;
    const visibleFiles = files.filter((file) => {
        if (user?.isBR) return true;
        return file.isVerified;
    });

    return visibleFiles.map((file) => (
        <FileDisplay file={file} key={file._id} code={code} isMobileView={isMobileView} />
    ));
};

export default FileController;
