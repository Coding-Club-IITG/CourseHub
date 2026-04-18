import mongoose from "mongoose";
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
