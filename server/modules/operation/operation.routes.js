import express from "express";
import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";

import {
    getOperation,
    listOperations,
    cancelOperation,
    retryOperation,
} from "./operation.controller.js";
const router = express.Router();
router.use(isLibraryAuthenticated);
router.get("/", listOperations);
router.get("/:id", getOperation);
router.post("/:id/cancel", cancelOperation);
router.post("/:id/retry", retryOperation);
export default router;
