import express from "express";
import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import catchAsync from "../../utils/catchAsync.js";
import {
    getOperation,
    listOperations,
    cancelOperation,
    retryOperation,
} from "./operation.controller.js";
const router = express.Router();
router.use(isLibraryAuthenticated);
router.get("/", catchAsync(listOperations));
router.get("/:id", catchAsync(getOperation));
router.post("/:id/cancel", catchAsync(cancelOperation));
router.post("/:id/retry", catchAsync(retryOperation));
export default router;
