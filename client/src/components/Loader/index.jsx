import "./styles.scss";

const Loader = ({ text = "Loading..." }) => {
    return (
        <div className="loader-container">
            <div className="loader-animation">
                <div className="golden-circular-loader"></div>
            </div>
            <div className="loader-text">
                <p>{text}</p>
            </div>
        </div>
    );
};

export default Loader;
