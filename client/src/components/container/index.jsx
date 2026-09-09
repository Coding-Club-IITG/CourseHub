import "./styles.scss";
const Container = ({ children, color, type }) => {
    return (
        <div className={`container ${color} ${type}`}>
            <div className="container-content">{children}</div>
        </div>
    );
};

export default Container;
