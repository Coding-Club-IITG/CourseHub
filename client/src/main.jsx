import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";

import "./fonts/ProximaNovaThin.otf";
import "./fonts/ProximaNovaRegular.otf";
import "./fonts/ProximaNovaBlack.otf";
import "./fonts/ProximaNovaBold.otf";

import { createStore } from "redux";
import reducers from "./reducers";
const store = createStore(reducers);
import { Provider } from "react-redux";

ReactDOM.createRoot(document.getElementById("root")).render(
    <Provider store={store}>
        <App />
    </Provider>,
);
