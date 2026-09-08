import User from "../../modules/user/user.model.js";
import UserUpdate from "../../modules/user/userUpdate.model.js";
import BR from "../../modules/br/br.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import { academicPeriod } from "../../services/authorization.js";
import { student } from "./library.js";
import { sessionHeaders } from "./sessions.js";

export async function permissionFixtures() {
    const period = academicPeriod();
    const actors = {};
    for (const [index, role] of [
        "owner",
        "student",
        "currentBR",
        "historicalBR",
        "unrelatedBR",
        "revokedBR",
        "unallottedBR",
    ].entries()) {
        const { _id, capabilities, ...base } = student;
        const person = await User.create({
            ...base,
            name: `Permission ${role}`,
            email: `${role.toLowerCase()}@permissions.example.test`,
            rollNumber: 299100000 + index,
            isBR: role === "revokedBR" || role === "unrelatedBR",
            courses: [{ code: "AUTH101", name: "Editable course list grants no permission" }],
            previousCourses: [
                { semester: 1, year: period.year - 1, courses: [{ code: "AUTH101" }] },
            ],
            readOnly: [{ code: "AUTH301", name: "Others course" }],
        });
        await UserUpdate.create({ rollNumber: person.rollNumber });
        if (["currentBR", "historicalBR", "unrelatedBR", "unallottedBR"].includes(role))
            await BR.create({ email: person.email.toUpperCase() });
        if (role !== "unallottedBR")
            await CourseAllotment.create({
                rollNumber: person.rollNumber,
                ...period,
                year: role === "historicalBR" ? period.year - 1 : period.year,
                courses: [role === "unrelatedBR" ? "AUTH201" : " auth101 "],
            });
        actors[role] = {
            person,
            headers: {
                ...(await sessionHeaders(person.id)),
                "content-type": "application/json",
            },
        };
    }
    const file = async (name, isVerified = false) =>
        FileModel.create({
            name,
            fileId: `provider-${name}`,
            size: "128",
            isVerified,
            webUrl: "https://provider.example.test/private",
            downloadUrl: "https://provider.example.test/private?download=1",
            thumbnail: { url: "https://ik.imagekit.io/coursehub-test/private.webp" },
        });
    const approved = await file("approved.pdf", true),
        pending = await file("pending.pdf"),
        foreign = await file("foreign.pdf");
    const leaf = await FolderModel.create({
        name: "Shared notes",
        courses: ["AUTH101", "AUTH301"],
        childType: "File",
        children: [approved._id, pending._id],
        totalFileCount: 999,
    });
    const root = await FolderModel.create({
        name: "2026",
        courses: ["AUTH101", "AUTH301"],
        childType: "Folder",
        children: [leaf._id],
        totalFileCount: 999,
    });
    const foreignLeaf = await FolderModel.create({
        name: "Unrelated notes",
        courses: ["AUTH201"],
        childType: "File",
        children: [foreign._id],
    });
    for (const code of ["AUTH101", "AUTH301", "AUTH201"])
        await Course.create({
            code,
            name: `Permission fixture ${code}`,
            children: [code === "AUTH201" ? foreignLeaf._id : root._id],
        });
    const contribution = await Contribution.create({
        contributionId: "permission-owned",
        uploadedBy: actors.owner.person.id,
        courseCode: "AUTH101",
        parentFolder: leaf._id,
        files: [pending._id],
        approved: false,
    });
    return { actors, approved, pending, foreign, leaf, root, foreignLeaf, contribution };
}
