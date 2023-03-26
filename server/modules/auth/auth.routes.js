import express, { json } from "express";
const router = express.Router();
const scope = "User.read offline_acess Mail.read";
import catchAsync from "../../utils/catchAsync.js";
import {
    redirectHandler,
    mobileRedirectHandler,
    loginHandler,
    logoutHandler,
    guestLoginHanlder,
} from "./auth.controller.js";

//not used
router.get("/login", loginHandler);
// router.get("/make/guest", makeGuestHanlder);
router.get("/login/guest", guestLoginHanlder);

router.get("/login/redirect/", catchAsync(redirectHandler));
router.get("/login/redirect/mobile", catchAsync(mobileRedirectHandler));

router.get("/logout", logoutHandler);

export default router;
