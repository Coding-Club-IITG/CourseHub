import "./styles.scss";

const SmallLoader = ({ text = "Loading..." }) => {
    return (
        <div className="small-loader-container">
            <div className="small-loader-animation">
                <div className="small-golden-circular-loader"></div>
            </div>
            <span className="small-loader-text">{text}</span>
        </div>
    );
};

export default SmallLoader;
