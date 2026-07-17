import { Response, NextFunction } from "express";
import { BoothService } from "../services/booth.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class BoothController {
  private boothService = new BoothService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.boothService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Tạo gian hàng mới thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.boothService.update(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật thông tin gian hàng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.boothService.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa gian hàng thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.boothService.findById(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin gian hàng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.boothService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách gian hàng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  // Public endpoint to list all booths without auth
  listAll = async (req: any, res: Response, next: NextFunction) => {
    try {
      const result = await this.boothService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách gian hàng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  uploadImages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng cung cấp ít nhất một file ảnh."
        });
      }
      const urls = await this.boothService.uploadImages(files);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải lên hình ảnh thành công.",
        data: urls
      });
    } catch (error) {
      next(error);
    }
  };
}
