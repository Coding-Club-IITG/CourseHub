import React from "react";
import "./styles.scss";
import Logo from "./components/logo";
import NavLink from "./components/navlink";
import SearchBar from "./components/searchbar";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { LogoutUser } from "../../actions/user_actions";
const NavBar = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const handleLogout = () => {
        dispatch(LogoutUser());
        window.location = "http://localhost:8080/api/auth/logout";
    };
    return (
        <nav className="navbar">
            <div className="active">
                <div className="nav-content">
                    <span onClick={() => navigate("/dashboard")}>
                        <Logo />
                    </span>
                    <SearchBar />
                    <div className="navlinks">
                        <NavLink text={"Dashboard"} onClick={() => navigate("/dashboard")} />
                        <NavLink text={"Profile"} onClick={() => navigate("/profile")} />
                        <NavLink text={"Log Out"} onClick={handleLogout} />
                    </div>
                </div>
            </div>
            <div className="passive">
                <SearchBar type={"passive"} />
            </div>
        </nav>
    );
};

export default NavBar;
