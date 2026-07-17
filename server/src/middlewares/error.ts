import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../constants";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || "Đã xảy ra lỗi hệ thống";

  console.error(`[Error] ${req.method} ${req.url} - Status ${statusCode} - ${message}`);
  if (err.stack && process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
