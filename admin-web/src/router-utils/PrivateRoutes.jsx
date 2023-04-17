import { Outlet, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { userLoggedIn } from "../actions/user-actions";

const useAuth = () => {
  const token = sessionStorage.getItem("token");
  if (!token) return false;
  return true;
};

const PrivateRoutes = () => {
  const isAuth = useAuth();
  return isAuth ? <Outlet /> : <Navigate to={"/login"} />;
};

export default PrivateRoutes;
