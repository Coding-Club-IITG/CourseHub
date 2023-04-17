import LoginScreen from "./pages/login";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import PrivateRoutes from "./router-utils/PrivateRoutes";
import DashboardPage from "./pages/dashboard";
import ViewPage from "./pages/view";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PrivateRoutes />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/view/:id" element={<ViewPage />} />
        </Route>
        <Route path="login" element={<LoginScreen />} />
        <Route path="*" element={<>404 Not Found</>} />
      </Routes>
    </Router>
  );
}

export default App;
