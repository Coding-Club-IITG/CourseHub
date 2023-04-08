import { NextFunction, Request, Response } from "express";
import { NotAuthenticatedError } from "../errors/not-authenticated-error";

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const user = req.session;
  if (!user) throw new NotAuthenticatedError();
  // check for user in the db
  return next();
}
