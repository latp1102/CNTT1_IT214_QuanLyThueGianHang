import { Response, NextFunction } from "express";
import { UserRepository } from "../repositories/user.repository";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";
import { AppError } from "../middlewares/error";

export class UserController {
  private userRepository = new UserRepository();

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "10");
      const search = req.query.search as string;

      const result = await this.userRepository.findAll({ page, limit, search });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách tài khoản thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new AppError("Trạng thái tài khoản là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.userRepository.update(parseInt(id), { status });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật trạng thái tài khoản thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (req.user && req.user.id === parseInt(id)) {
        throw new AppError("Bạn không thể tự xóa tài khoản của chính mình.", HTTP_STATUS.BAD_REQUEST);
      }

      await this.userRepository.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa tài khoản thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  getRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.userRepository.getRoles();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách vai trò thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.userRepository.getPermissions();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách quyền hạn thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  assignRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { roleIds } = req.body;

      if (!roleIds || !Array.isArray(roleIds)) {
        throw new AppError("Danh sách vai trò không hợp lệ.", HTTP_STATUS.BAD_REQUEST);
      }

      await this.userRepository.assignRoles(parseInt(id), roleIds);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Phân vai trò tài khoản thành công."
      });
    } catch (error) {
      next(error);
    }
  };
}
