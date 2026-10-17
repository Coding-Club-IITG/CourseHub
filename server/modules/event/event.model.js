import mongoose from "mongoose";

// Fixed _id of the single exam dates record, so concurrent upserts cannot create duplicates.
export const EXAM_DATES_ID = new mongoose.Types.ObjectId("000000000000000000e0a710");

const EventSchema = new mongoose.Schema({
    firstYearDates: {
        midSem: { type: Date },
        endSem: { type: Date },
    },
    otherDates: {
        midSem: { type: Date },
        endSem: { type: Date },
    },
});
const Event = mongoose.model("Event", EventSchema);
export default Event;
