import { loginDestination } from "../../utils/loginDestination";
import MicrosoftSignIn from "./components/microsoftbutton";
import "./styles.scss";
import { Navigate } from "react-router-dom";
import { handleLogin } from "../../api/User";
import { useSession } from "../../session/context";
import Loader from "../../components/Loader";
import { RequestError } from "@coursehub/browser/react";
const LandingPage = () => {
    const result = useSession();
    if (result.data)
        return (
            <Navigate
                to={loginDestination(new URLSearchParams(window.location.search).get("returnTo"))}
                replace
            />
        );
    if (result.isError)
        return (
            <RequestError
                title="We couldn’t check your session. Please try again."
                onRetry={result.refetch}
            />
        );
    const loading = result.isPending;
    return loading ? (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                backgroundColor: "#f5f5f5",
            }}
        >
            <Loader text="Loading..." />
        </div>
    ) : (
        <>
            <section className="landing">
                <div className="top">
                    <div className="right"></div>
                </div>
                <div className="bottom">
                    <div className="content">
                        <div className="text">
                            <p>
                                Your go-to platform for all your academic needs. Get access to past
                                papers, lecture slides, assignments, tutorials, notes and more to
                                help you ace your exams
                            </p>
                        </div>
                        <div className="btn-container">
                            <MicrosoftSignIn setClicked={handleLogin} />
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default LandingPage;
