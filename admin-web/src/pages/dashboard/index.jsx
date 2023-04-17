import React, { useEffect, useState } from "react";
import useRequest from "../../hooks/useRequest";
import { useNavigate } from "react-router-dom";
const DashboardPage = () => {
  const [contributions, setContributions] = useState([]);
  const navigate = useNavigate();

  const { doRequest, errors } = useRequest({
    url: "http://localhost:8080/api/contribution/all",
    method: "get",
  });

  async function fetchContributions() {
    sessionStorage.removeItem("contributions");
    const resp = await doRequest();
    console.log(resp);
    if (resp) {
      setContributions(resp);
      sessionStorage.setItem("contributions", JSON.stringify(resp));
    }
  }
  useEffect(() => {
    sessionStorage.getItem("contributions") &&
      setContributions(JSON.parse(sessionStorage.getItem("contributions")));
  }, []);

  return (
    <div className="container">
      <p className="display-5">Admin Dashboard</p>

      {errors}
      <div>
        <button
          className="btn btn-danger me-2"
          onClick={() => {
            sessionStorage.clear();
            window.location = "/";
          }}
        >
          Logout
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            fetchContributions();
            // sessionStorage.clear();
            // window.location = "/";
          }}
        >
          Fetch Contributions
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Code</th>
            <th scope="col">Description</th>
            <th scope="col">Folder</th>
            <th scope="col">Year</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c, idx) => {
            return (
              <tr key={c._id}>
                <th scope="row">{idx}</th>
                <td>{c.courseCode}</td>
                <td>{c.description}</td>
                <td>{c.folder}</td>
                <td>{c.year}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      navigate(`/view/${idx}`);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardPage;
