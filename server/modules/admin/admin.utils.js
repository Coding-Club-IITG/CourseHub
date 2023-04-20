import fs from "fs";
import { getAccessToken, getRequest } from "../onedrive/onedrive.routes.js";
import axios from "axios";

export async function moveAllFolderFiles(fromFolderId, toFolderId) {
    const accessToken = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${accessToken}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${fromFolderId}/children`;
    var config = {
        method: "get",
        url: url,
        headers: headers,
    };
    const response = await axios.get(config.url, {
        headers: config.headers,
    });
    // console.log(response.data.value);
    response.data.value.map(async (file) => {
        await moveFile(file.id, toFolderId, file.name);
    });
}

export async function moveFile(fileId, folderId, name) {
    const accessToken = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${accessToken}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
    var config = {
        method: "patch",
        url: url,
        headers: headers,
        data: {
            parentReference: {
                id: folderId,
            },
            name: name,
        },
    };
    const response = await axios.patch(config.url, config.data, {
        headers: config.headers,
    });

    return response?.data;
}
export async function getFolderVisitLink(folderName) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/root:/CourseHub Contributions/${folderName}:/`;
    var data = await getRequest(url, headers);
    return data["webUrl"];
}
export async function getFolderIdByName(folderName) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/root:/CourseHub Contributions/${folderName}:/`;
    var data = await getRequest(url, headers);
    return data["id"];
}

function formatCourseAdmin(course) {
    const root = course.children;
    const ret = [];

    root.forEach((folder) => {
        parseFolder(folder);
    });
    // console.log(root);
    fs.writeFileSync("resp.json", JSON.stringify(root));
}

function parseFolder(folder) {
    console.log(folder);
    if (folder.childType === "File") {
        console.log("file containing folder", folder.name);
        delete folder.children;
    } else if (folder.childType === "Folder") {
        parseFolder(folder.children);
    }
}
const data = {
    _id: "63fb920f68fe6671b91b0f47",
    name: "group theory",
    code: "ch224",
    children: [
        {
            _id: "63fb920e68fe6671b91b0e68",
            course: "ch224",
            id: "01OXYV376COKXM6WC3BVBJ2B5F5ITSHHIO",
            name: "2022",
            childType: "Folder",
            path: "CH224 - Group Theory/",
            children: [
                {
                    _id: "63fb91d968fe6671b91aea82",
                    course: "ch224",
                    id: "01OXYV377YUW6CTHNFMBHJ7QECDSJQHKXL",
                    name: "Books",
                    childType: "File",
                    path: "CH224 - Group Theory/2022/",
                    children: [
                        {
                            _id: "63fb91d868fe6671b91aea2a",
                            course: "ch224 - group theory",
                            name: "Chemical Applications of Group Theory Solutions.pdf",
                            id: "01OXYV377NLCQRAOFREJF2LIJ3W33BAK7N",
                            size: "0.674368",
                            thumbnail:
                                "https://ik.imagekit.io/c7u7l7qa8/01OXYV377NLCQRAOFREJF2LIJ3W33BAK7N_ksWOAv0sPHe.jpg",
                        },
                        {
                            _id: "63fb91d768fe6671b91ae9b2",
                            course: "ch224 - group theory",
                            name: "Chemical Applications of Group Theory.pdf",
                            id: "01OXYV373DQHVOX5OHKZD2TIBREIPSSUOH",
                            size: "18.623310999999998",
                            thumbnail:
                                "https://ik.imagekit.io/c7u7l7qa8/01OXYV373DQHVOX5OHKZD2TIBREIPSSUOH_hwj1_BO71M.jpg",
                        },
                    ],
                },
                {
                    _id: "63fb920d68fe6671b91b0e06",
                    course: "ch224",
                    id: "01OXYV37575D6MVVSSLJFISSKVMKNZKJ4X",
                    name: "Exams",
                    childType: "Folder",
                    path: "CH224 - Group Theory/2022/",
                    children: [
                        {
                            _id: "63fb920a68fe6671b91b0c9a",
                            course: "ch224",
                            id: "01OXYV37YG4FZ5FA7UYNBYQMDPUIV3J3JC",
                            name: "Past Years",
                            childType: "File",
                            path: "CH224 - Group Theory/2022/Exams/",
                            children: [
                                {
                                    _id: "63fb91fc68fe6671b91b08fc",
                                    course: "ch224 - group theory",
                                    name: "32_Reducible representations.pdf",
                                    id: "01OXYV377NT3JXS5ZPU5CZCWV5Z42J24ZK",
                                    size: "0.019053999999999998",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV377NT3JXS5ZPU5CZCWV5Z42J24ZK_pnsEi7-MsYS.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b053e",
                                    course: "ch224 - group theory",
                                    name: "assignment 2 1.pdf",
                                    id: "01OXYV37YSY6XB6TST5VFKUEENLKQ4RFAJ",
                                    size: "0.09335199999999999",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV37YSY6XB6TST5VFKUEENLKQ4RFAJ_upgzt7wfMYU.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b04de",
                                    course: "ch224 - group theory",
                                    name: "assignment1 (1).pdf",
                                    id: "01OXYV372JOXPWTQFZ6JC3YTVM5URR53BK",
                                    size: "0.046338",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV372JOXPWTQFZ6JC3YTVM5URR53BK_hrP4O6-p2C.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b0062",
                                    course: "ch224 - group theory",
                                    name: "assignment1.pdf",
                                    id: "01OXYV37YDSKK2HUJ6C5ALV5JGEOFJ276E",
                                    size: "0.046338",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV37YDSKK2HUJ6C5ALV5JGEOFJ276E_Ob02geb00a4.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b002c",
                                    course: "ch224 - group theory",
                                    name: "endsem_12_april.pdf",
                                    id: "01OXYV37345SBVG4HIXBE25EG5XQC7EILO",
                                    size: "0.223436",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV37345SBVG4HIXBE25EG5XQC7EILO_jF7pOPASlfr.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91aff22",
                                    course: "ch224 - group theory",
                                    name: "endsem_13_april.pdf",
                                    id: "01OXYV372AWUJ2HVQ22FAJK2SOER2HLYY3",
                                    size: "0.535994",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV372AWUJ2HVQ22FAJK2SOER2HLYY3_5ZGkxky7by.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91aff52",
                                    course: "ch224 - group theory",
                                    name: "endsem_16_april.pdf",
                                    id: "01OXYV377LEAY5UG5RCFBJULQMTNVBSLQP",
                                    size: "0.9255009999999999",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV377LEAY5UG5RCFBJULQMTNVBSLQP_DvpsYJkQel.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b0728",
                                    course: "ch224 - group theory",
                                    name: "endsem_17_april.pdf",
                                    id: "01OXYV377GQHI6SVI22ZHZZGVNCOCEDNCW",
                                    size: "0.928761",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV377GQHI6SVI22ZHZZGVNCOCEDNCW_aRFGadLooQu.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b04c6",
                                    course: "ch224 - group theory",
                                    name: "endsem_19_april.pdf",
                                    id: "01OXYV374KOFTS3T2ZX5FYSI6B6BP24KCY",
                                    size: "0.934496",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV374KOFTS3T2ZX5FYSI6B6BP24KCY_nRqCbaeaBIg.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b084e",
                                    course: "ch224 - group theory",
                                    name: "endsem_20_april.pdf",
                                    id: "01OXYV375OJ4574J6QE5CIQFH7QER7PIT5",
                                    size: "0.887552",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV375OJ4574J6QE5CIQFH7QER7PIT5_8rBSPiqmMBk.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b00de",
                                    course: "ch224 - group theory",
                                    name: "M200122042.pdf",
                                    id: "01OXYV3727NJFC2RBU5FEZZEX2BMKKKO3G",
                                    size: "13.947334999999999",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV3727NJFC2RBU5FEZZEX2BMKKKO3G_6Pm6MA4tt5.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b006e",
                                    course: "ch224 - group theory",
                                    name: "Quiz 1 CH224.pdf",
                                    id: "01OXYV377UACCV5TXSRJAJNKKW3EIT66KW",
                                    size: "0.469167",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV377UACCV5TXSRJAJNKKW3EIT66KW_WJgBJgL-cXO.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b0246",
                                    course: "ch224 - group theory",
                                    name: "Quiz delocalisation energy etc.pdf",
                                    id: "01OXYV375YQXWCKPH7INB2VUBQEDJYAGYT",
                                    size: "5.403824",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV375YQXWCKPH7INB2VUBQEDJYAGYT_ZMg_O1DXNcl.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91b0026",
                                    course: "ch224 - group theory",
                                    name: "quiz1.pdf",
                                    id: "01OXYV374LBZCJTYV6OJDJEZEGADOC636Q",
                                    size: "0.182163",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV374LBZCJTYV6OJDJEZEGADOC636Q_BIgYKETPH7Y.jpg",
                                },
                                {
                                    _id: "63fb91fb68fe6671b91affce",
                                    course: "ch224 - group theory",
                                    name: "quiz4.pdf",
                                    id: "01OXYV374RM3577L37FFHIDNV4TS36XFJ3",
                                    size: "0.13824799999999998",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV374RM3577L37FFHIDNV4TS36XFJ3_neMI2hfoon7.jpg",
                                },
                                {
                                    _id: "63fb91fc68fe6671b91b05c2",
                                    course: "ch224 - group theory",
                                    name: "Screenshot (49).png",
                                    id: "01OXYV375SIHN272YPMZCI7I5MK4TELKGK",
                                    size: "0.35863",
                                    thumbnail:
                                        "https://ik.imagekit.io/c7u7l7qa8/01OXYV375SIHN272YPMZCI7I5MK4TELKGK_87ei1JiaCGv.jpg",
                                },
                            ],
                        },
                    ],
                },
                {
                    _id: "63fb91d368fe6671b91ae82c",
                    course: "ch224",
                    id: "01OXYV372UMTE4W5Y6K5A3K5HIGQOKKG6Z",
                    name: "Lectures Slides",
                    childType: "File",
                    path: "CH224 - Group Theory/2022/",
                    children: [],
                },
                {
                    _id: "63fb91d368fe6671b91ae828",
                    course: "ch224",
                    id: "01OXYV376PAFPR5JNWYBCJUKFP34CASUGA",
                    name: "Notes",
                    childType: "File",
                    path: "CH224 - Group Theory/2022/",
                    children: [],
                },
                {
                    _id: "63fb91d368fe6671b91ae84e",
                    course: "ch224",
                    id: "01OXYV37ZAEUEFJXPA4ZDZ6T5JKFDBS7DA",
                    name: "Tutorials",
                    childType: "File",
                    path: "CH224 - Group Theory/2022/",
                    children: [],
                },
            ],
        },
    ],
    books: [],
};
// formatCourseAdmin(data);
