import { Route, BrowserRouter, Routes } from "react-router-dom";
import AuthScreen from "./screens/auth";
function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route element={<AuthScreen />} path="" />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
