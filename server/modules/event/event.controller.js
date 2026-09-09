import { getExamSchedule } from "../../services/examSchedule.js";

async function GetExamDates(req, res) {
    res.set("Cache-Control", "private, no-store");
    return res.json(await getExamSchedule(req.user));
}

export default { GetExamDates };
