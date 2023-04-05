import { app } from "./index";
import { Router } from "express";

const mainRouter = Router();

mainRouter.use("/", (req, res, next) => {
  res.send("Hello world!");
});

export default mainRouter;
