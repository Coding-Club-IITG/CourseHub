import axios from "axios";
import { useState } from "react";
function useRequest({ url, method, data, token }) {
  const [errors, setErrors] = useState(null);
  async function doRequest() {
    try {
      setErrors(null);
      const resp = await axios({
        url,
        method,
        data,
        headers: token && { Authorization: `Token ${token}` },
      });
      return resp.data;
    } catch (error) {
      // console.log(error);
      if (error.code === "ERR_NETWORK") {
        setErrors(
          <div className="alert alert-danger">
            <h4>Ooops...</h4>
            <ul className="my-0">
              <li key="NetworkError">Network Error</li>
            </ul>
          </div>
        );
      } else {
        // if (typeof error.response.data.message === "string")
        // setErrors([{ message: error.response.data.message }]);
        // else setErrors(error.response.data.message);
        setErrors(
          <div className="alert alert-danger">
            <h4>Ooops...</h4>
            <ul className="my-0">
              {typeof error.response.data.message === "string" ? (
                <li key={error.response.data.message}>{error.response.data.message}</li>
              ) : (
                error.response.data.message.map((err) => {
                  return <li key={err.message}>{err.message}</li>;
                })
              )}
            </ul>
          </div>
        );
      }
    }
  }
  return { doRequest, errors };
}

export default useRequest;
