import "./styles.scss";
const Container = ({ children, color, type, className }) => {
    return (
        <div className={["container", color, type, className].filter(Boolean).join(" ")}>
            <div className="container-content">{children}</div>
        </div>
    );
};

export default Container;
