import "./styles.scss";
const Heading = ({ text, type, color }) => {
    return <h1 className={`heading ${type} ${color}`}>{text ? text : "No Text Provided"}</h1>;
};

export default Heading;
