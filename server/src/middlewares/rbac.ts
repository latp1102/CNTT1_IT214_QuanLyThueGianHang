import { Response, NextFunction } from "express";
import { HTTP_STATUS, ROLES } from "../constants";
import { AppError } from "./error";
import { AuthenticatedRequest } from "../models";

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Yêu cầu quyền truy cập. Vui lòng cung cấp mã xác thực.", HTTP_STATUS.UNAUTHORIZED);
    }

    const { roles, permissions } = req.user;

    // Admin role bypasses all permission checks
    if (roles.includes(ROLES.ADMIN)) {
      return next();
    }

    // Check if user has all the required permissions
    const hasPermission = requiredPermissions.every((perm) => permissions.includes(perm));

    if (!hasPermission) {
      return next(new AppError("Bạn không có quyền thực hiện chức năng này.", HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Yêu cầu quyền truy cập. Vui lòng cung cấp mã xác thực.", HTTP_STATUS.UNAUTHORIZED);
    }

    const { roles } = req.user;

    const hasRole = allowedRoles.some((role) => roles.includes(role));

    if (!hasRole) {
      return next(new AppError("Bạn không có vai trò phù hợp để truy cập tài nguyên này.", HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};
