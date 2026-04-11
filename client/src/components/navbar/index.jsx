import React, { useState, useEffect, useRef } from "react";
import "./styles.scss";
import Logo from "./components/logo";
import NavLink from "./components/navlink";
import SearchBar from "./components/searchbar";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import server from "../../api/server";

import { LogoutUser } from "../../actions/user_actions";

const NavBar = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);
    const toggleButtonRef = useRef(null);

    const handleLogout = () => {
        dispatch(LogoutUser());
        window.location = `${server}/api/auth/logout`;
    };

    const toggleMobileMenu = (e) => {
        e.stopPropagation();
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                toggleButtonRef.current &&
                !toggleButtonRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === "Escape") {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleEscapeKey);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isMobileMenuOpen]);

    const handleNavLinkClick = (action) => {
        action();
        closeMobileMenu();
    };

    return (
        <nav className="navbar">
            <div className="active">
                <div className="nav-content">
                    <span onClick={() => navigate("/dashboard")}>
                        <Logo />
                    </span>
                    <SearchBar />
                    <div className="navlinks desktop-nav">
                        <NavLink text={"Dashboard"} onClick={() => navigate("/dashboard")} />
                        <NavLink text={"Profile"} onClick={() => navigate("/profile")} />
                        <NavLink text={"Log Out"} onClick={handleLogout} />
                    </div>
                    <div
                        className="mobile-menu-toggle"
                        onClick={toggleMobileMenu}
                        ref={toggleButtonRef}
                        aria-label="Toggle mobile menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <div className={`three-dots ${isMobileMenuOpen ? "cross" : ""}`}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        
                        <div
                            className={`mobile-menu ${isMobileMenuOpen ? "open" : ""}`}
                            ref={mobileMenuRef}
                        >
                            <div className="mobile-menu-content">
                                <NavLink
                                    text={"Dashboard"}
                                    onClick={() => handleNavLinkClick(() => navigate("/dashboard"))}
                                />
                                <NavLink
                                    text={"Profile"}
                                    onClick={() => handleNavLinkClick(() => navigate("/profile"))}
                                />
                                <NavLink
                                    text={"Log Out"}
                                    onClick={() => handleNavLinkClick(handleLogout)}
                                />
                            </div>
                        </div>
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
