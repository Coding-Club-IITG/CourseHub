import BR from "./br.model.js";
import User from "../user/user.model.js";
import { fetchCoursesForBr } from "../auth/auth.controller.js";
import logger from "../../utils/logger.js";

const updateBRs = async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || emails.length === 0) {
            return res.status(400).json({ error: "emails are required" });
        }

        for (const { email } of emails) {
            const user = await User.findOne({ email });

            if (user) {
                if (!user.isBR) {
                    user.isBR = true;
                    await fetchCoursesForBr(user.rollNumber);
                    await user.save();
                }
                await BR.updateOne({ email }, { $set: { email } }, { upsert: true });
            } else {
                await BR.updateOne({ email }, { $set: { email } }, { upsert: true });
            }
        }

        res.status(201).json({ message: "BRs updated successfully" });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const createBR = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: "email is required" });

        const exists = await BR.findOne({ email });
        if (exists) return res.status(409).json({ error: "BR already exists" });
        const br = await BR.create({ email });
        res.status(201).json({ message: "BR added", br });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getAll = async (req, res, next) => {
    try {
        const list = await BR.find({});
        res.status(200).json({ list });
    } catch (err) {
        next(err);
    }
};

const deleteBR = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "email is required" });

        const br = await BR.findOneAndDelete({ email });
        if (!br) return res.status(404).json({ error: "BR not found" });

        res.status(200).json({ message: "BR deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getBRs = async (req, res) => {
    try {
        const brs = await User.find({ isBR: true });
        res.status(200).json({ brs });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export { updateBRs, createBR, getAll, deleteBR, getBRs };
