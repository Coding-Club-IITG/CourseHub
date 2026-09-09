import "./styles.scss";

const Button = (props) => {
    return (
        <div className="btn" onClick={props.onClick}>
            {props.text}
        </div>
    );
};

export default Button;
