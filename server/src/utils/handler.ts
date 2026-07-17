import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../models";

type AsyncHandler = (req: AuthenticatedRequest, res: any, next: any) => Promise<any>;

export const asHandler = (fn: AsyncHandler): RequestHandler => {
  return (req, res, next) => fn(req as AuthenticatedRequest, res, next);
};
