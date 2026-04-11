import mongoose from "mongoose";

const UserUpdateSchema = new mongoose.Schema({
    rollNumber: {
        type: Number,
    },
});

const UserUpdate = mongoose.model("UserUpdate", UserUpdateSchema);

export default UserUpdate;
