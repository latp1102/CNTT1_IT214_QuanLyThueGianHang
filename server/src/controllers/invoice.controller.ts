import { Response, NextFunction } from "express";
import { InvoiceService } from "../services/invoice.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class InvoiceController {
  private invoiceService = new InvoiceService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.invoiceService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Tạo hóa đơn thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.update(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật hóa đơn thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.invoiceService.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa hóa đơn thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.findById(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin hóa đơn thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.invoiceService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách hóa đơn thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  exportExcel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.exportExcel(parseInt(id));

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${result.fileName}`);
      res.status(HTTP_STATUS.OK).send(result.content);
    } catch (error) {
      next(error);
    }
  };

  exportPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const htmlContent = await this.invoiceService.exportPdf(parseInt(id));
      res.setHeader("Content-Type", "text/html");
      res.status(HTTP_STATUS.OK).send(htmlContent);
    } catch (error) {
      next(error);
    }
  };
}
