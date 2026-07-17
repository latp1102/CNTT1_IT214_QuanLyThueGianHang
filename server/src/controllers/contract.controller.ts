import { Response, NextFunction } from "express";
import { ContractService } from "../services/contract.service";
import { PdfService } from "../services/pdf.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";
import { ContractRepository } from "../repositories/contract.repository";

export class ContractController {
  private contractService = new ContractService();
  private pdfService = new PdfService();
  private contractRepository = new ContractRepository();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.contractService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Tạo hợp đồng thuê mới thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contractService.update(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cập nhật hợp đồng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  extend = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contractService.extend(parseInt(id), req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Gia hạn hợp đồng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  terminate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contractService.terminate(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Thanh lý hợp đồng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.contractService.delete(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Xóa hợp đồng thành công."
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.contractService.findById(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải chi tiết hợp đồng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.contractService.findAll(req.query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải danh sách hợp đồng thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  uploadPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng cung cấp tập tin PDF hợp đồng."
        });
      }
      const url = await this.contractService.uploadPdf(file);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải lên PDF hợp đồng thành công.",
        data: url
      });
    } catch (error) {
      next(error);
    }
  };

  downloadPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const contract = await this.contractRepository.findById(parseInt(id));
      if (!contract) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Hợp đồng không tồn tại."
        });
      }
      const pdfBuffer = await this.pdfService.generateContractPdf(contract);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="hop-dong-${contract.contractCode}.pdf"`);
      res.status(HTTP_STATUS.OK).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  verifyContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const contract = await this.contractRepository.findByCode(code);
      if (!contract) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Hợp đồng không tồn tại hoặc mã không hợp lệ.",
          data: null
        });
      }
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Hợp đồng hợp lệ.",
        data: {
          contractCode: contract.contractCode,
          status: contract.status,
          customerName: contract.customer.name,
          boothName: contract.booth.name,
          startDate: contract.startDate,
          endDate: contract.endDate,
          deposit: contract.deposit
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
