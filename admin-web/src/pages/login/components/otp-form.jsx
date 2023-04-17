import React from "react";
import useRequest from "../../../hooks/useRequest";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { userAuthCompleted, userLoggedIn } from "../../../actions/user-actions";
const OTPForm = ({ user }) => {
  const [otp, setOTP] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { doRequest, errors } = useRequest({
    url: "http://localhost:8080/api/admin/login",
    method: "post",
    data: {
      otp: parseInt(otp),
      username: user,
    },
  });

  async function handleLogin() {
    setDisabled(true);
    const resp = await doRequest();
    console.log(resp);
    if (!resp) setDisabled(false);
    if (resp.loginSuccessful === true) {
      sessionStorage.setItem("token", resp.token);
      // dispatch(userAuthCompleted());
      navigate("/");
    }
  }
  return (
    <>
      <div className="row">
        <div className="col-12 col-lg-5 col-md-6">
          {errors ? (
            <>
              {errors}
              <p className="text-muted">Please refresh and enter credentials again.</p>
            </>
          ) : (
            ""
          )}
        </div>
      </div>
      {!errors && (
        <div className="row">
          <div className="col-12 col-lg-5 col-md-6">
            <div class="mb-3">
              <label for="exampleFormControlInput1" class="form-label">
                OTP
              </label>
              <input
                type="number"
                class="form-control"
                id="exampleFormControlInput1"
                onChange={(e) => {
                  setOTP(e.target.value);
                  if (e.target.value >= 100000) setDisabled(false);
                  else setDisabled(true);
                }}
              />
            </div>
            <button className="btn btn-success" disabled={disabled} onClick={handleLogin}>
              Sumbit OTP
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OTPForm;
