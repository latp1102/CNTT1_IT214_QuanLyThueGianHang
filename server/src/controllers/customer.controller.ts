import { Response, NextFunction } from "express";
import { CustomerService } from "../services/customer.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class CustomerController {
  private customerService = new CustomerService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.customerService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Thêm khách thuê mới thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.customerService.update(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật thông tin khách thuê thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.customerService.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa thông tin khách thuê thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.customerService.findById(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin khách thuê thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.customerService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách khách thuê thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng tải lên tập tin hình ảnh avatar."
        });
      }
      const url = await this.customerService.uploadAvatar(file);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải lên avatar thành công.",
        data: url
      });
    } catch (error) {
      next(error);
    }
  };

  uploadImages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { customerId } = req.body;
      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng chọn ít nhất một hình ảnh."
        });
      }
      if (!customerId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Thiếu mã khách thuê."
        });
      }
      const urls = await this.customerService.uploadImages(files, parseInt(customerId));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Tải lên ${urls.length} hình ảnh thành công.`,
        data: urls
      });
    } catch (error) {
      next(error);
    }
  };

  findWithImages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.customerService.findWithImages(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin khách thuê thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  deleteImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { imageId } = req.params;
      await this.customerService.deleteImage(parseInt(imageId));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa hình ảnh thành công."
      });
    } catch (error) {
      next(error);
    }
  };
}
