import prisma from "../config/db";
import { ChatMessage } from "@prisma/client";

export class ChatHistoryService {
  /** Prisma client chưa generate lại → chatMessage undefined */
  private get chatMessage() {
    return (prisma as any).chatMessage as typeof prisma.chatMessage | undefined;
  }

  /**
   * Lưu tin nhắn vào database
   */
  async saveMessage(
    userId: number,
    role: "user" | "bot",
    content: string,
    sessionId?: string,
  ): Promise<ChatMessage | null> {
    if (!this.chatMessage) {
      console.warn(
        "[ChatHistory] prisma.chatMessage chưa sẵn sàng. Chạy: npx prisma generate (sau khi stop server).",
      );
      return null;
    }

    try {
      return await this.chatMessage.create({
        data: {
          userId,
          role,
          content,
          sessionId,
        },
      });
    } catch (error) {
      console.error("[ChatHistory] saveMessage failed:", error);
      return null;
    }
  }

  /**
   * Lấy lịch sử chat của user (mặc định 10 tin nhắn gần nhất)
   */
  async getHistory(
    userId: number,
    limit: number = 10,
    sessionId?: string,
  ): Promise<ChatMessage[]> {
    if (!this.chatMessage) {
      return [];
    }

    try {
      const where: any = { userId };
      if (sessionId) {
        where.sessionId = sessionId;
      }

      return await this.chatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      console.error("[ChatHistory] getHistory failed:", error);
      return [];
    }
  }

  /**
   * Lấy context từ lịch sử chat (dùng cho system prompt)
   */
  async getChatContext(
    userId: number,
    limit: number = 5,
    sessionId?: string,
  ): Promise<string> {
    const messages = await this.getHistory(userId, limit * 2, sessionId);

    if (messages.length === 0) {
      return "";
    }

    // Sắp xếp theo thời gian tăng dần (cũ nhất đến mới nhất)
    messages.reverse();

    let context = "\n=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===\n";
    messages.forEach((msg) => {
      const role = msg.role === "user" ? "Người dùng" : "Trợ lý";
      context += `${role}: ${msg.content}\n`;
    });
    context += "=== HẾT LỊCH SỬ ===\n";

    return context;
  }

  /**
   * Xóa tin nhắn cũ (giữ lại 100 tin nhắn gần nhất của user)
   */
  async cleanupOldMessages(
    userId: number,
    keepCount: number = 100,
  ): Promise<number> {
    if (!this.chatMessage) {
      return 0;
    }

    try {
      const messages = await this.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: keepCount,
        select: { id: true },
      });

      if (messages.length === 0) {
        return 0;
      }

      const result = await this.chatMessage.deleteMany({
        where: {
          id: { in: messages.map((m) => m.id) },
        },
      });

      return result.count;
    } catch (error) {
      console.error("[ChatHistory] cleanupOldMessages failed:", error);
      return 0;
    }
  }

  /**
   * Tạo session ID mới
   */
  generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
