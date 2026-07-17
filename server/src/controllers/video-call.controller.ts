import { Response, NextFunction } from "express";
import { VideoCallService } from "../services/video-call.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class VideoCallController {
  private videoCallService = new VideoCallService();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { receiverId } = req.body;
      const callerId = req.user!.id;
      const result = await this.videoCallService.create({ callerId, receiverId: parseInt(receiverId) });
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Tạo cuộc gọi thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  startCall = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.videoCallService.startCall(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Cuộc gọi đã bắt đầu.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  endCall = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.videoCallService.endCall(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Kết thúc cuộc gọi.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  rejectCall = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.videoCallService.rejectCall(parseInt(id));
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Từ chối cuộc gọi.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await this.videoCallService.getHistory(userId, {
        page: parseInt(req.query.page as string || "1"),
        limit: parseInt(req.query.limit as string || "20")
      });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải lịch sử cuộc gọi thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
