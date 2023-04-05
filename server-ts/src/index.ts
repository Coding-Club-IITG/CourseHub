import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import mainRouter from "./main-router";
import { errorHandler } from "./middlewares/error-handler";
import { DatabaseConnectionError } from "./errors/database-connection-error";
dotenv.config();

export const app = express();

async function startServer() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO URI ENV ERR");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    throw new DatabaseConnectionError();
  }

  app.use(mainRouter);
  app.use(errorHandler);

  app.listen(process.env.PORT, () => {
    console.log("Listening on port", process.env.PORT);
  });
}

startServer();
