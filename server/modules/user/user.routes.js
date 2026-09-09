import isAuthenticated from "../../middleware/isAuthenticated.js";
import { Router } from "express";
import {
    getUser,
    synchronizeCourses,
    addToFavouriteController,
    removeFromFavouritesController,
    updateUserController,
    updateDeviceToken,
    getFavouritesController,
    addReadOnly,
    deleteReadOnly,
} from "./user.controller.js";

const router = Router();
router.use(isAuthenticated);

router.get("/", getUser);
router.post("/synchronize", synchronizeCourses);
router.put("/update", updateUserController);

router.get("/favourites", getFavouritesController);
router.post("/favourites", addToFavouriteController);

router.delete("/favourites/:id", removeFromFavouritesController);
router.post("/readonly", addReadOnly);
router.delete("/readonly/:code", deleteReadOnly);
router.put("/devicetoken", updateDeviceToken);
export default router;
