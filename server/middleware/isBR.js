import { actorFor } from "../services/authorization.js";
import AppError from "../utils/appError.js";
export const isBR = async (req, res, next) => {
    try {
        const actor = await actorFor(req);
        if (!actor.admin && !actor.isBR) throw new AppError(403, "Not authorized as BR");
        next();
    } catch (error) {
        next(error);
    }
};
