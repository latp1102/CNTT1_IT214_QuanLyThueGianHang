import { Response, NextFunction } from "express";
import { ReportService } from "../services/report.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class ReportController {
  private reportService = new ReportService();

  getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.reportService.getDashboardStats(req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải dữ liệu tổng quan thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getRevenueReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const type = (req.query.type as "monthly" | "quarterly" | "yearly") || "monthly";
      const result = await this.reportService.getRevenueReport({ year, type });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải báo cáo doanh thu thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getTopCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const result = await this.reportService.getTopCustomers(limit);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách khách thuê hàng đầu thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getTopBooths = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const result = await this.reportService.getTopBooths(limit);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách gian hàng doanh thu cao thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
