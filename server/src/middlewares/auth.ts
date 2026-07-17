import { Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { HTTP_STATUS } from "../constants";
import { AppError } from "./error";
import { AuthenticatedRequest } from "../models";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "booth_rental_access_secret_key_123456";

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      throw new AppError("Yêu cầu quyền truy cập. Vui lòng cung cấp mã xác thực.", HTTP_STATUS.UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      avatar: decoded.avatar || null,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      next(new AppError("Mã xác thực đã hết hạn. Vui lòng làm mới token.", HTTP_STATUS.UNAUTHORIZED));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn.", HTTP_STATUS.UNAUTHORIZED));
    }
  }
};
