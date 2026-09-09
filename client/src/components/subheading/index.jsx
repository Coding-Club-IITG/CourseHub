import "./styles.scss";
const SubHeading = ({ text, type, color, algn }) => {
    return <p className={`subheading ${type} ${color} ${algn}`}>{text}</p>;
};

export default SubHeading;
