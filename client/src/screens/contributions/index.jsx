import Wrapper from "./components/wrapper";
import SectionC from "./components/sectionC";
import axios from "axios";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useEffect, useRef, useState } from "react";
import "./styles.scss";
import { v4 as uuidv4 } from "uuid";
import { CreateNewContribution } from "../../api/Contribution";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import server from "../../api/server";

import { getCourse } from "../../api/Course";
import {
    UpdateCourses,
    RefreshCurrentFolder,
    ChangeCurrentYearData,
} from "../../actions/filebrowser_actions";
const Contributions = () => {
    const uploadedBy = useSelector((state) => state.user.user._id);
    const userName = useSelector((state) => state.user.user.name);
    const isBR = useSelector((state) => state.user.user.isBR);
    const currYear = useSelector((state) => state.fileBrowser.currentYear);
    const currentFolder = useSelector((state) => state.fileBrowser.currentFolder);
    const code = currentFolder?.course;
    const [contributionId, setContributionId] = useState("");
    const dispatch = useDispatch();
    useEffect(() => {
        setContributionId(uuidv4());
    }, []);

    const [submitEnabled, setSubmitEnabled] = useState(false);

    // const [contributionId, setContributionId] = useState("");

    let pond = useRef();

    const handleUpdateFiles = (fileItems) => {
        if (fileItems.length > 0) setSubmitEnabled(true);
        else setSubmitEnabled(false);
    };

    async function handleSubmit() {
        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        // console.log(toggle);
        // console.log(isAnoynmous);

        try {
            setSubmitEnabled(false);
            // console.log(resp);
            let resp = await CreateNewContribution({
                parentFolder: currentFolder._id,
                courseCode: currentFolder.course,
                description: "default",
                approved: false,
                contributionId,
                uploadedBy,
            });
            // console.log(resp);
            await pond.current.processFiles();
            pond.current.removeFiles();
            contributionSection.classList.remove("show");
            toast.success("Files uploaded successfully!");
            setContributionId(uuidv4());
            setSubmitEnabled(true);
        } catch (error) {
            setSubmitEnabled(true);
            contributionSection.classList.remove("show");
            toast.error("Failed to upload! Please try again.");
            console.log(error);
        }

        //refresh the course in session storage to include the new file.
        try {
            let loadingCourseToastId = toast.loading("Loading course data...");
            const currCourse = await getCourse(code);
            const { data } = currCourse;
            if (!data.found) {
                toast.dismiss(loadingCourseToastId);
                toast.error("Course data not found!");
                return;
            }
            dispatch(RefreshCurrentFolder());
            dispatch(UpdateCourses(data));
            dispatch(ChangeCurrentYearData(currYear, data.children[currYear].children));
            toast.dismiss(loadingCourseToastId);
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    return (
        <SectionC>
            <Wrapper>
                <div className="head">{isBR ? "📁 Add Files" : "📁 Contribute to CourseHub"}</div>
                <div className="disclaimer">
                    Selected Files will get uploaded to the current folder
                </div>
                <div className="file_pond large">
                    <FilePond
                        name="file"
                        allowMultiple={true}
                        onupdatefiles={handleUpdateFiles}
                        maxFiles={40}
                        server={{
                            url: `${server}/api/contribution/upload`,
                            process: {
                                headers: {
                                    "contribution-id": contributionId,
                                    username: userName,
                                },
                            },
                        }}
                        instantUpload={false}
                        ref={(ref) => {
                            pond.current = ref;
                        }}
                    />

                    <div className="filepond-overlay">
                        <div className="overlay-line">Selected Files will get uploaded to the current folder</div>
                        <div className="overlay-warning">🚫 Do not close this popup until all files are uploaded!</div>
                        {!isBR && (
                            <div className="overlay-branch">
                                ⚠️ Please contact your Branch Representative to verify your uploaded files.
                            </div>
                        )}
                    </div>
                </div>
                <div className={`button ${submitEnabled}`} onClick={handleSubmit}>
                    SUBMIT
                </div>
            </Wrapper>
        </SectionC>
    );
};
export default Contributions;
