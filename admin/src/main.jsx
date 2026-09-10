import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.jsx";
import { QueryClientProvider } from "@coursehub/browser";
import { session } from "./session";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <QueryClientProvider client={session.queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>,
);
