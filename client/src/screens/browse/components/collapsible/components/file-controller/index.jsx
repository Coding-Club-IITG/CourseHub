import FileDisplay from "../../../file-display";

const FileController = ({ files, code, isMobileView = false }) => {

    if (!files) return null;
    return files.map((file, idx) => (
        <FileDisplay file={file} key={file._id} code={code} isMobileView={isMobileView} index={idx} />
    ));
};

export default FileController;
