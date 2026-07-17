import { Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class PaymentController {
  private paymentService = new PaymentService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Ghi nhận thanh toán thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.paymentService.update(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật giao dịch thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.paymentService.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa giao dịch thanh toán thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.paymentService.findById(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin thanh toán thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách thanh toán thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  createVNPayUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const url = await this.paymentService.createVNPayUrl(req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tạo liên kết thanh toán VNPay thành công.",
        data: url
      });
    } catch (error) {
      next(error);
    }
  };

  createMoMoUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const url = await this.paymentService.createMoMoUrl(req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tạo liên kết thanh toán MoMo thành công.",
        data: url
      });
    } catch (error) {
      next(error);
    }
  };

  generateQRCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.generateQRCode(req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tạo mã QR thanh toán thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
