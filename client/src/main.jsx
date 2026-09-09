import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./session/SessionProvider";

import "./index.css";

import "./fonts/ProximaNovaThin.otf";
import "./fonts/ProximaNovaRegular.otf";
import "./fonts/ProximaNovaBlack.otf";
import "./fonts/ProximaNovaBold.otf";

ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <SessionProvider>
            <App />
        </SessionProvider>
    </StrictMode>,
);
