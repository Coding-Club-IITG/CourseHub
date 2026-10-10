import "./styles.scss";
const Wrapper = (props) => {
    return (
        <div className={`upload-dialog ${props.className || ""}`} id="upload-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            {props.children}
        </div>
    );
};
export default Wrapper;
