import EventModel, { EXAM_DATES_ID } from "./event.model.js";
import AppError from "../../utils/appError.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDateString(date) {
    if (!date) return "";
    return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function parseISTDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00+05:30`);
    if (isNaN(date.getTime()) || toISTDateString(date) !== value) return null;
    return date;
}

function parseDateGroup(group, label) {
    const midSem = parseISTDate(group?.midSem);
    const endSem = parseISTDate(group?.endSem);
    if (!midSem || !endSem) throw new AppError(400, `Invalid ${label} dates`);
    if (endSem < midSem) throw new AppError(400, `${label} end-sem date cannot be before mid-sem date`);
    return { midSem, endSem };
}

function formatDates(dates) {
    return {
        midSem: toISTDateString(dates?.midSem),
        endSem: toISTDateString(dates?.endSem),
    };
}

async function GetExamDates(req, res, next) {
    const semester = req.user.semester;
    const examDates = await EventModel.findById(EXAM_DATES_ID);
    if (!examDates) return next(new AppError(404, "Data not available"));
    if (semester === 1) return res.json({ dates: examDates.firstYearDates });
    return res.json({ dates: examDates.otherDates });
}

async function GetAdminExamDates(req, res) {
    const event = await EventModel.findById(EXAM_DATES_ID);
    return res.json({
        firstYearDates: formatDates(event?.firstYearDates),
        otherDates: formatDates(event?.otherDates),
    });
}

async function UpsertExamDates(req, res) {
    const { firstYearDates, otherDates } = req.body;
    const update = {
        firstYearDates: parseDateGroup(firstYearDates, "1st year"),
        otherDates: parseDateGroup(otherDates, "2nd+ year"),
    };
    const upsert = () =>
        EventModel.findOneAndUpdate({ _id: EXAM_DATES_ID }, { $set: update }, { upsert: true, new: true });
    let event;
    try {
        event = await upsert();
    } catch (err) {
        // A concurrent first save inserted the record between our match and insert; retry as an update.
        if (err.code !== 11000) throw err;
        event = await upsert();
    }
    return res.json({
        firstYearDates: formatDates(event.firstYearDates),
        otherDates: formatDates(event.otherDates),
    });
}

async function CreateEvent(req, res) {
    const content = req.body;
    const event = await EventModel.create(content);
    return res.status(201).json({ event });
}

export default { GetExamDates, GetAdminExamDates, UpsertExamDates, CreateEvent };
