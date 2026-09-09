import "./styles.scss";
const File = ({ file }) => {
    return (
        <div className="file">
            <div className="vertical-line"></div>
            <div className="horizontal-line"></div>
            <div className="text">{file.name}</div>
        </div>
    );
};

export default File;
