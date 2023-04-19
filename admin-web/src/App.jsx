import LoginScreen from "./pages/login";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import PrivateRoutes from "./router-utils/PrivateRoutes";
import DashboardPage from "./pages/dashboard";
import ViewPage from "./pages/view";
import ApprovePage from "./pages/approve";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PrivateRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/view/:id" element={<ViewPage />} />
          <Route path="/approve/:id" element={<ApprovePage />} />
        </Route>
        <Route path="login" element={<LoginScreen />} />
        <Route path="*" element={<>404 Not Found</>} />
      </Routes>
    </Router>
  );
}

export default App;
