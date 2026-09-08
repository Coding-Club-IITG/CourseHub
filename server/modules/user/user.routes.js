import isAuthenticated from "../../middleware/isAuthenticated.js";
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
    deleteReadOnly,
} from "./user.controller.js";
import catchAsync from "../../utils/catchAsync.js";
const router = Router();
router.use(isAuthenticated);

router.get("/", catchAsync(getUser));
router.put("/update", catchAsync(updateUserController));

router.get("/favourites", catchAsync(getFavouritesController));
router.post("/favourites", catchAsync(addToFavouriteController));

router.delete("/favourites/:id", catchAsync(removeFromFavouritesController));
router.post("/course", catchAsync(addNewCourse));
router.post("/readonly", catchAsync(addReadOnly));
router.delete("/course/:code", catchAsync(deleteCourse));
router.delete("/readonly/:code", catchAsync(deleteReadOnly));
router.put("/devicetoken", catchAsync(updateDeviceToken));
export default router;
