import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./session/SessionProvider";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <SessionProvider>
            <App />
        </SessionProvider>
    </StrictMode>,
);
