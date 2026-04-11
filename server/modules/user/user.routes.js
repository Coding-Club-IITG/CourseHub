import { Router } from "express";
import {
    getUser,
    addToFavouriteController,
    removeFromFavouritesController,
    updateUserController,
    addNewCourse,
    deleteCourse,
    updateDeviceToken,
    getFavouritesController,
    addReadOnly,
    deleteReadOnly

} from "./user.controller.js";
import catchAsync from "../../utils/catchAsync.js";
const router = Router();

import isAuthenticated from "../../middleware/isAuthenticated.js";

router.get("/", isAuthenticated, catchAsync(getUser));
router.put("/update", isAuthenticated, catchAsync(updateUserController));

router.get("/favourites", isAuthenticated, catchAsync(getFavouritesController));
router.post("/favourites", isAuthenticated, catchAsync(addToFavouriteController));

router.delete("/favourites/:id", isAuthenticated, catchAsync(removeFromFavouritesController));
router.post("/course", isAuthenticated, catchAsync(addNewCourse));
router.post("/readonly", isAuthenticated, catchAsync(addReadOnly))
router.delete("/course/:code", isAuthenticated, catchAsync(deleteCourse));
router.delete("/readonly/:code", isAuthenticated, catchAsync(deleteReadOnly));
router.put("/devicetoken", isAuthenticated, catchAsync(updateDeviceToken));
export default router;
