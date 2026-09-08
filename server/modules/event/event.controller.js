import EventModel from "./event.model.js";
import AppError from "../../utils/appError.js";

async function GetExamDates(req, res, next) {
    const semester = req.user.semester;
    const examDates = await EventModel.findOne();
    if (!examDates) return next(new AppError(404, "Data not available"));
    if (semester === 1) return res.json({ dates: examDates.firstYearDates });
    return res.json({ dates: examDates.otherDates });
}

export default { GetExamDates };
