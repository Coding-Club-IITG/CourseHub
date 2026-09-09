import "./styles.scss";
const SectionC = (props) => {
    const offHandler = (event) => {
        if (event.target.id === "contri" && !props.busy) {
            const collection = document.getElementsByClassName("contri");
            const contributionSection = collection[0];
            contributionSection.classList.remove("show");
        }
    };
    return (
        <div className="contri" id="contri" onClick={offHandler}>
            {props.children}
        </div>
    );
};
export default SectionC;
