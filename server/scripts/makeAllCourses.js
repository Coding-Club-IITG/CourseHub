import axios from "axios";
import config from "../config/default.js";
const baseUrl = config.localApiBaseUrl || "";

const wait = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

async function main() {
    const resp = await axios.get(`${baseUrl}/api/file/getCourseIds`);
    const allCourses = resp.data;
    console.log("Total Courses:", allCourses.length);

    for (let i = 0; i < allCourses.length; i++) {
        console.log(`Attempting to create ${i} ::  ${allCourses[i].name}`);
        try {
            const res = await axios.post(`${baseUrl}/api/admin/course`, {
                id: allCourses[i].id,
                code: allCourses[i].name.split("-")[0].trim().toLowerCase(),
            });
            console.log(`Created ${allCourses[i].name}`);
        } catch (error) {
            console.log(error.message);
        }
        // await wait(3000);
    }
}

main();
