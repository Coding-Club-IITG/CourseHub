import { Link } from "react-router-dom";
import FrontBanner from "./components/FrontBanner";
import Contri_section from "./components/Contri_section";
import { Fragment } from "react";
import NavBar from "../../components/navbar";
import Footer from "../../components/footer";
import "./styles.scss";

const ProfilePage = () => {
    return (
        <Fragment>
            <div className={"main-wrapper"}>
                <div>
                    <NavBar />
                    <FrontBanner />
                    <div className="profile-course-refresh">
                        <Link to="/loading?returnTo=%2Fprofile">Refresh registered courses</Link>
                    </div>
                    <Contri_section />
                </div>
                <div>
                    <Footer />
                </div>
            </div>
        </Fragment>
    );
};
export default ProfilePage;
