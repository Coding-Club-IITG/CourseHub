import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ViewPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function generateFolderLink(folderName) {
    try {
      setLoading(true);
      const resp = await axios.get(
        `http://localhost:8080/api/admin/contribution/visit/${folderName}`
      );
      const folderLink = resp.data.link;
      setLoading(false);
      window.open(folderLink, "_newtab");
    } catch (error) {
      setLoading(false);
      alert("Something went wrong!");
    }
  }

  useEffect(() => {
    const data = JSON.parse(sessionStorage.getItem("contributions"));
    // console.log(data[id]);
    setData(data[id]);
  }, []);

  return (
    <div className="container p-4">
      <p className="display-5">Contribution Details</p>
      {loading && (
        <div className="alert alert-secondary">
          <h4>Generating visit link</h4>
          <ul className="my-0">
            <li key="NetworkError">This may take upto 30 seconds.</li>
          </ul>
        </div>
      )}
      {data ? (
        <div className="row">
          <div className="col-6">
            <table class="table table-striped">
              {" "}
              <tbody>
                <tr>
                  <th scope="row">Course Code</th>
                  <td>{data.courseCode}</td>
                </tr>
                <tr>
                  <th scope="row">Folder</th>
                  <td>{data.folder}</td>
                </tr>
                <tr>
                  <th scope="row">Year</th>
                  <td colspan="2">{data.year}</td>
                </tr>
                <tr>
                  <th scope="row">Description</th>
                  <td colspan="2">{data.description}</td>
                </tr>{" "}
                <tr>
                  <th scope="row">Contribution Id</th>
                  <td colspan="2">{data.contributionId}</td>
                </tr>
                <tr>
                  <th scope="row">Anonymous</th>
                  <td colspan="2">{data.isAnonymous ? "Yes" : "No"}</td>
                </tr>
              </tbody>
            </table>
            <button
              className="btn btn-primary mb-2 me-2"
              onClick={() => generateFolderLink(data.contributionId)}
            >
              Visit Files
            </button>
            <button
              className="btn btn-secondary mb-2"
              onClick={() => {
                navigate("/");
              }}
            >
              Go Back
            </button>
            <div class="accordion" id="accordionExample">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button
                    class="accordion-button"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseOne"
                    aria-expanded="true"
                    aria-controls="collapseOne"
                  >
                    Actions
                  </button>
                </h2>
                <div
                  id="collapseOne"
                  class="accordion-collapse collapse"
                  data-bs-parent="#accordionExample"
                >
                  <div class="accordion-body">
                    <button className="btn btn-success" onClick={() => navigate(`/approve/${id}`)}>
                      Approve
                    </button>
                    <button className="btn btn-danger m-2">Delete</button>
                  </div>
                </div>
              </div>
            </div>
            <br />
          </div>
          <div className="col-6">
            <ul class="list-group list-group-flush">
              <p className="h5">Files</p>
              {data?.fileName?.map((file) => {
                return (
                  <li class="list-group-item" key={file}>
                    {file}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        "loading..."
      )}
    </div>
  );
};

export default ViewPage;
