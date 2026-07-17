import { Response, NextFunction } from "express";
import { ChatService } from "../services/chat.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class ChatController {
  private chatService = new ChatService();

  sendMessage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { message, sessionId } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng nhập tin nhắn hợp lệ.",
        });
      }

      const reply = await this.chatService.processMessage(
        req.user!.id,
        message.trim(),
        sessionId,
      );
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { reply, sessionId },
      });
    } catch (error) {
      next(error);
    }
  };
}
