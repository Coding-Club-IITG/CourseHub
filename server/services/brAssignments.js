import BR from "../modules/br/br.model.js";
import User from "../modules/user/user.model.js";
import { scheduleStudentSync } from "./academicSync.js";
import { normalizeEmail, isEmail } from "@coursehub/domain";
import AppError from "../utils/appError.js";
export async function assignBR(value, admin, { recordId } = {}) {
    const email = normalizeEmail(value);
    if (!isEmail(email)) throw new AppError(400, "A valid email address is required");
    const br = await BR.findOneAndUpdate(
        { email },
        { $set: { email }, ...(recordId ? { $setOnInsert: { _id: recordId } } : {}) },
        { upsert: true, returnDocument: "after", collation: { locale: "en", strength: 2 } },
    );
    const user = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
    let synchronization;
    if (user) {
        await User.updateOne({ _id: user._id }, { $set: { isBR: true } });
        synchronization = await scheduleStudentSync(user, {
            actorId: admin._id,
            actorRole: "admin",
        });
    }
    return { br, synchronization };
}
