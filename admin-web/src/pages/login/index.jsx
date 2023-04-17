import React, { useEffect, useState } from "react";
import LoginForm from "./components/login-form";
import OTPForm from "./components/otp-form";

const LoginScreen = () => {
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [user, setUser] = useState(null);

  return (
    <div className="container">
      <div className="d-flex align-items-center">
        <img
          src="./ch-logo.png"
          style={{
            width: "50px",
            height: "50px",
            display: "inline",
            marginRight: "15px",
          }}
        />
        <p className="display-5 pb-1 mt-3">Admin</p>
      </div>
      {!otpGenerated ? (
        <LoginForm setOtpGenerated={setOtpGenerated} setUser={setUser} />
      ) : (
        <OTPForm user={user} />
      )}
    </div>
  );
};

export default LoginScreen;
