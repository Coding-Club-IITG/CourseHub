import React, { useEffect } from "react";

const ErrorScreen = () => {
    useEffect(() => {
        document.title = "Page Not Found | CourseHub";
        return () => {
            document.title = "CourseHub";
        };
    }, []);

    return (
        <div
            style={{
                fontSize: "5rem",
                textAlign: "center",
                margin: "2rem",
            }}
        >
            404: Not Found
        </div>
    );
};

export default ErrorScreen;