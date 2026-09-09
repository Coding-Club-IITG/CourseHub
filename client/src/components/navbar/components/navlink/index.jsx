import "./styles.scss";
const NavLink = ({ text, onClick }) => {
    return (
        <div className="nav-link" onClick={onClick}>
            {text ? text : "no text"}
        </div>
    );
};

export default NavLink;
