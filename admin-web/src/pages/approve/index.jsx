import React, { useState } from "react";
import { useParams } from "react-router-dom";
import useRequest from "../../hooks/useRequest";
import FolderController from "./components/folder-controller";
const ApprovePage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [movingFiles, setMovingFiles] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState(null);

  const courseData = JSON.parse(sessionStorage.getItem("contributions"))[id];
  const { doRequest, errors } = useRequest({
    url: `http://localhost:8080/api/course/${courseData.courseCode.toLowerCase()}`,
    method: "get",
  });

  useState(() => {
    async function getCourseData() {
      const resp = await doRequest();
      setData(resp);
    }
    getCourseData();
  }, []);

  return (
    <div className="container p-3">
      {errors}
      <p className="display-5">Approve Contribution</p>
      {movingFiles && (
        <div className="alert alert-secondary">
          <h4>Approving contribution...</h4>
          <ul className="my-0">
            <li key="NetworkError">Please wait while server is approving the contribution.</li>
            <li key="NetworkError">This may take upto 2 minutes.</li>
          </ul>
        </div>
      )}
      {!data && (
        <div className="alert alert-success">
          <h4>Loading folder data...</h4>
          <ul className="my-0">{/* <li key="NetworkError">Loading link.</li> */}</ul>
        </div>
      )}
      {data && !data?.children && (
        <>
          <div className="alert alert-danger">
            <h4>Course not found!</h4>
          </div>
          <button className="btn btn-secondary me-2">Create course</button>
          <button
            className="btn btn-light"
            onClick={() => {
              window.location = "/view/" + id;
            }}
          >
            Go back
          </button>
        </>
      )}

      {data && data?.children && !movingFiles && (
        <>
          <p className="h4">Select Folder</p>
          <div className="row">
            <div className="col-6">
              <FolderController folders={data?.children} setSelectedFolder={setSelectedFolder} />
            </div>
            <div className="col-6">
              <p className="h5 text-muted">
                Selected Folder: {selectedFolder?.name ? selectedFolder?.name : "None"}
              </p>
              <button
                className={`btn btn-success me-2`}
                disabled={!selectedFolder}
                onClick={() => {
                  setMovingFiles(true);
                  setSelectedFolder(null);
                }}
              >
                Approve Contribution
              </button>
              <button
                className="btn btn-danger"
                onClick={() => (window.location = "/view/" + id)}
                disabled={movingFiles}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ApprovePage;
