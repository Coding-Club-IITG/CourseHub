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
    const [isUploading, setIsUploading] = useState(false);

    // const [contributionId, setContributionId] = useState("");

    let pond = useRef();

    const handleUpdateFiles = (fileItems) => {
        if (fileItems.length > 0) setSubmitEnabled(true);
        else setSubmitEnabled(false);
    };

    async function handleSubmit() {
        if (isUploading) return;

        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        // console.log(toggle);
        // console.log(isAnoynmous);

        try {
            setIsUploading(true);
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
            toast.error("Upload failed. Please try again!");
            // console.log(error);
        } finally {
            setIsUploading(false);
        }

        //refresh the course in session storage to include the new file.
        try {
            let loadingCourseToastId = toast.loading("Loading course data...");
            const currCourse = await getCourse(code);
            const { data } = currCourse;
            if (!data.found) {
                toast.dismiss(loadingCourseToastId);
                toast.error("Couldn't find course data!");
                return;
            }
            dispatch(RefreshCurrentFolder());
            dispatch(UpdateCourses(data));
            dispatch(ChangeCurrentYearData(currYear, data.children[currYear].children));
            toast.dismiss(loadingCourseToastId);
        } catch (error) {
            // console.log(error);
            return null;
        }
    }

    return (
        <SectionC>
            <Wrapper>
                <div className="head">{isBR ? "Upload Files" : "Share Your Files"}</div>
                <div className="disclaimer">
                    {isBR
                        ? "Upload files to this folder"
                        : "Your files will be added to this folder"}
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
                        allowProcess={false}
                        allowRevert={false}
                        ref={(ref) => {
                            pond.current = ref;
                        }}
                    />
                </div>
                <div id="disclaimer-container">
                    <div id="uploaded-container">
                        <div>Note:</div>
                        <div>Do not close this window while files are being uploaded.</div>
                    </div>
                    {!isBR ? (
                        <div id="uploaded-container">
                            <div>Note:</div>
                            <div>
                                Files require approval from a Branch Representative before becoming
                                visible to other users.
                            </div>
                            </div>
                    ):(
                        <></>
                        )}
                    
                </div>
                <div className={`button ${submitEnabled && !isUploading}`} onClick={handleSubmit}>
                    {isUploading ? "UPLOADING..." : "SUBMIT"}
                </div>
            </Wrapper>
        </SectionC>
    );
};
export default Contributions;
