import "./styles.scss";
function SemCard(props) {
    return (
        <div className="semCard">
            <div className="inner1">
                <div className="inputDiv">{props.sem}</div>
            </div>
            <div className="inner2">Semester</div>
        </div>
    );
}

export default SemCard;
