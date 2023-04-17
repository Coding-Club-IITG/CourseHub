import React from "react";
import { useSelector } from "react-redux";
const DashboardPage = () => {
  return (
    <div>
      DashboardPage welcome,
      <button
        className="btn btn-danger"
        onClick={() => {
          sessionStorage.clear();
          window.location = "/";
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default DashboardPage;
