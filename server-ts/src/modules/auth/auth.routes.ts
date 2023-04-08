import { Router } from "express";
import { isAuthenticated } from "../../middlewares/isAuthenticated";

export const userRouter = Router();

userRouter.get("/", isAuthenticated);
userRouter.put("/update");
userRouter.post("/favourites");
userRouter.delete("/favourites/:id");
userRouter.post("/course");
userRouter.delete("/course/:code");
