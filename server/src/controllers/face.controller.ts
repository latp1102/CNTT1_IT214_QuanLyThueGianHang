import { Response, NextFunction } from "express";
import { FaceService } from "../services/face.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

const faceService = new FaceService();

export class FaceController {
  saveFaceDescriptor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required",
        });
      }
      const { faceDescriptor } = req.body;
      if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng cung cấp Face Descriptor hợp lệ.",
        });
      }
      const result = await faceService.saveFaceDescriptor(req.user.id, faceDescriptor);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { faceDescriptor } = req.body;
      if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng cung cấp Face Descriptor hợp lệ.",
        });
      }
      const result = await faceService.loginWithFace(faceDescriptor);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Đăng nhập bằng khuôn mặt thành công!",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
