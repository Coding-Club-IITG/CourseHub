import { listStudents } from "../../services/studentAdministration.js";
import BR from "./br.model.js";
import User from "../user/user.model.js";
import { assignBR } from "../../services/brAssignments.js";
import { normalizeEmail, isEmail } from "@coursehub/domain";

import logger from "../../utils/logger.js";

const createBR = async (req, res) => {
    res.status(201).json({
        message: "BR assignment saved",
        ...(await assignBR(req.body.email, req.admin)),
    });
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
        const normalizedEmail = normalizeEmail(req.body?.email);
        if (!isEmail(normalizedEmail))
            return res.status(400).json({ error: "A valid email address is required" });

        const br = await BR.findOneAndDelete({ email: normalizedEmail }).collation({
            locale: "en",
            strength: 2,
        });
        if (!br) return res.status(404).json({ error: "BR not found" });
        await User.updateOne(
            { email: normalizedEmail },
            { $set: { isBR: false } },
            { collation: { locale: "en", strength: 2 } },
        );

        res.status(200).json({ message: "BR deleted successfully" });
    } catch (error) {
        logger.error("BR deletion failed", {
            error,
            attributes: {
                dependency: "mongodb",
                operation: "delete-br",
                outcome: "failure",
                retryable: false,
            },
        });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getBRs = async (req, res) => res.json(await listStudents(req.query, { brOnly: true }));

export { createBR, getAll, deleteBR, getBRs };
