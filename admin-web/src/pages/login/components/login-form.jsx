import React, { useState } from "react";
import useRequest from "../../../hooks/useRequest";

const LoginForm = ({ setOtpGenerated, setUser }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(true);

  const { doRequest, errors } = useRequest({
    url: "http://localhost:8080/api/admin/otp",
    method: "post",
    data: {
      username,
      password,
    },
  });

  function updateDisabled() {
    if (username.length < 3 || password.length < 6) setBtnDisabled(true);
    else setBtnDisabled(false);
  }

  async function handleLogin(p) {
    setDisabled(true);
    setBtnDisabled(true);
    const resp = await doRequest();
    console.log(resp);
    if (!resp) {
      setDisabled(false);
      setBtnDisabled(true);
    }
    if (resp) {
      setUser(username);
      setBtnDisabled(true);
      setOtpGenerated(true);
    }
  }
  return (
    <>
      <div className="row">
        <div className="col-12 col-lg-5 col-md-6">{errors}</div>
      </div>
      <div className="row">
        <div className="col-12 col-lg-5 col-md-6">
          <div class="mb-3">
            <label for="exampleFormControlInput1" class="form-label">
              Username
            </label>
            <input
              className="form-control"
              id="exampleFormControlInput1"
              onChange={(e) => setUsername(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <div class="mb-3">
            <label for="exampleFormControlInput2" class="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="exampleFormControlInput2"
              onChange={(e) => {
                updateDisabled();
                setPassword(e.target.value);
              }}
              disabled={disabled}
              required
            />
          </div>
          <button
            className="btn btn-success"
            disabled={btnDisabled}
            onClick={() => {
              updateDisabled();
              handleLogin();
            }}
          >
            Login
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
