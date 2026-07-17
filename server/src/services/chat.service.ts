import prisma from "../config/db";
import { ChatRAGService } from "./chat-rag.service";
import { ChatHistoryService } from "./chat-history.service";
import { analyticsService } from "./analytics.service";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

interface SystemContext {
  boothStats: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
  };
  contractStats: {
    total: number;
    active: number;
    expired: number;
    terminated: number;
  };
  invoiceStats: { paid: number; unpaid: number; overdue: number };
  revenueStats: {
    total: number;
    monthlyTotal: number;
    activeContractCount: number;
  };
  customerStats: { total: number; active: number };
}

export class ChatService {
  private ragService = new ChatRAGService();
  private historyService = new ChatHistoryService();

  async processMessage(
    userId: number,
    message: string,
    sessionId?: string,
  ): Promise<string> {
    if (!GEMINI_API_KEY) {
      return "❌ Hệ thống AI chưa được cấu hình. Vui lòng liên hệ admin để thiết lập GEMINI_API_KEY.";
    }

    try {
      const currentSessionId =
        sessionId || this.historyService.generateSessionId();

      await this.historyService.saveMessage(
        userId,
        "user",
        message,
        currentSessionId,
      );

      const analyticsReport = await this.detectAndGenerateAnalytics(message);
      if (analyticsReport) {
        await this.historyService.saveMessage(
          userId,
          "bot",
          analyticsReport,
          currentSessionId,
        );
        await this.historyService.cleanupOldMessages(userId, 100);
        return analyticsReport;
      }

      const retrievalContext = await this.ragService.retrieveContext(message);
      const systemContext = await this.getSystemContext();
      const chatHistory = await this.historyService.getChatContext(
        userId,
        5,
        currentSessionId,
      );

      const systemPrompt = this.buildSystemPrompt(
        systemContext,
        retrievalContext,
        chatHistory,
      );

      const response = await this.callGeminiAI(systemPrompt, message);

      await this.historyService.saveMessage(
        userId,
        "bot",
        response,
        currentSessionId,
      );

      await this.historyService.cleanupOldMessages(userId, 100);

      return response;
    } catch (error) {
      console.error("Chat error:", error);
      return "❌ Đã xảy ra lỗi khi xử lý câu hỏi. Vui lòng thử lại sau.";
    }
  }

  private async getSystemContext(): Promise<SystemContext> {
    const [boothStats, contractStats, invoiceStats, customerStats, payments] =
      await Promise.all([
        this.getBoothStats(),
        this.getContractStats(),
        this.getInvoiceStats(),
        this.getCustomerStats(),
        prisma.payment.findMany({
          where: { status: "completed" },
          select: { amount: true, paymentDate: true },
        }),
      ]);

    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
    const currentMonth = new Date().getMonth();
    const monthlyTotal = payments
      .filter(
        (p) =>
          p.paymentDate && new Date(p.paymentDate).getMonth() === currentMonth,
      )
      .reduce((s, p) => s + p.amount, 0);

    return {
      boothStats,
      contractStats,
      invoiceStats,
      customerStats,
      revenueStats: {
        total: totalRevenue,
        monthlyTotal,
        activeContractCount: contractStats.active,
      },
    };
  }

  private async getBoothStats() {
    const [total, available, rented, maintenance] = await Promise.all([
      prisma.booth.count(),
      prisma.booth.count({ where: { status: "available" } }),
      prisma.booth.count({ where: { status: "rented" } }),
      prisma.booth.count({ where: { status: "maintenance" } }),
    ]);
    return { total, available, rented, maintenance };
  }

  private async getContractStats() {
    const [total, active, expired, terminated] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: "active" } }),
      prisma.contract.count({ where: { status: "expired" } }),
      prisma.contract.count({ where: { status: "terminated" } }),
    ]);
    return { total, active, expired, terminated };
  }

  private async getInvoiceStats() {
    const [paid, unpaid, overdue] = await Promise.all([
      prisma.invoice.count({ where: { status: "paid" } }),
      prisma.invoice.count({ where: { status: "unpaid" } }),
      prisma.invoice.count({ where: { status: "overdue" } }),
    ]);
    return { paid, unpaid, overdue };
  }

  private async getCustomerStats() {
    const [total, active] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "active" } }),
    ]);
    return { total, active };
  }

  private buildSystemPrompt(
    context: SystemContext,
    retrievalContext: any,
    chatHistory: string = "",
  ): string {
    const {
      boothStats,
      contractStats,
      invoiceStats,
      revenueStats,
      customerStats,
    } = context;

    let retrievalInfo = "";
    if (
      retrievalContext.data &&
      Array.isArray(retrievalContext.data) &&
      retrievalContext.data.length > 0
    ) {
      retrievalInfo = `

=== DỮ LIỆU LIÊN QUAN ĐẾN CÂU HỎI ===
Dữ liệu loại: ${retrievalContext.type}
Số kết quả: ${retrievalContext.data.length}
Chi tiết:
${JSON.stringify(retrievalContext.data, null, 2)}`;
    } else if (retrievalContext.data && !Array.isArray(retrievalContext.data)) {
      retrievalInfo = `

=== DỮ LIỆU LIÊN QUAN ĐẾN CÂU HỎI ===
${JSON.stringify(retrievalContext.data, null, 2)}`;
    }

    return `Bạn là trợ lý AI thông minh của hệ thống "Quản lý Thuê Gian hàng Thương mại". 
Bạn có kiến thức toàn diện về hệ thống và dữ liệu thực tế hiện tại.

=== THÔNG TIN HỆ THỐNG HIỆN TẠI (TỔNG QUÁT) ===
🏪 GIAN HÀNG:
- Tổng: ${boothStats.total} | Trống: ${boothStats.available} | Đang thuê: ${boothStats.rented} | Bảo trì: ${boothStats.maintenance}

📄 HỢP ĐỒN:
- Tổng: ${contractStats.total} | Hoạt động: ${contractStats.active} | Hết hạn: ${contractStats.expired} | Thanh lý: ${contractStats.terminated}

🧾 HÓA ĐƠN:
- Đã thanh toán: ${invoiceStats.paid} | Chưa thanh toán: ${invoiceStats.unpaid} | Quá hạn: ${invoiceStats.overdue}

💰 DOANH THU:
- Tổng cộng: ${revenueStats.total.toLocaleString("vi-VN")} đ
- Tháng này: ${revenueStats.monthlyTotal.toLocaleString("vi-VN")} đ
- Hợp đồng đang hoạt động: ${revenueStats.activeContractCount}

👥 KHÁCH THUÊ:
- Tổng: ${customerStats.total} | Hoạt động: ${customerStats.active}
${retrievalInfo}
${chatHistory}

=== HƯỚNG DẪN ===
1. Trả lời tất cả các câu hỏi bằng tiếng Việt, thân thiện, chuyên nghiệp
2. Sử dụng dữ liệu thực tế trên để trả lời câu hỏi về thống kê
3. Khi có dữ liệu cụ thể (DỮ LIỆU LIÊN QUAN), hãy sử dụng chúng để trả lời chi tiết
4. Giải thích rõ ràng các tính năng của hệ thống
5. Gợi ý người dùng hành động phù hợp dựa trên tình hình kinh doanh
6. Sử dụng emoji để làm response sinh động nhưng chuyên nghiệp
7. Sắp xếp kết quả theo thứ tự ưu tiên (ví dụ: hóa đơn quá hạn đầu tiên)
8. Lưu ý lịch sử trò chuyện để hiểu ngữ cảnh và cung cấp câu trả lời liên quan`;
  }

  private async detectAndGenerateAnalytics(
    message: string,
  ): Promise<string | null> {
    const lower = message.toLowerCase();

    const isAnalyticsIntent =
      /báo cáo|phân tích|analytics|thống kê chi tiết|dashboard|tổng quan hệ thống|xu hướng|khuyến nghị/.test(
        lower,
      ) ||
      (/doanh thu|gian hàng|hợp đồng|khách/.test(lower) &&
        /báo cáo|phân tích|xu hướng|tình hình|hiệu suất/.test(lower));

    if (!isAnalyticsIntent) {
      return null;
    }

    try {
      let report;

      if (/doanh thu|revenue|thu nhập/.test(lower)) {
        report = await analyticsService.generateRevenueAnalytics();
      } else if (/gian hàng|booth|lấp đầy|occupancy/.test(lower)) {
        report = await analyticsService.generateBoothAnalytics();
      } else if (/hợp đồng|contract/.test(lower)) {
        report = await analyticsService.generateContractAnalytics();
      } else if (/khách|customer/.test(lower)) {
        report = await analyticsService.generateCustomerAnalytics();
      } else {
        const dashboard = await analyticsService.generateDashboard();
        const alertText =
          dashboard.alerts.length > 0
            ? `\n\n🚨 **Cảnh báo:**\n${dashboard.alerts.map((a) => `- ${a}`).join("\n")}`
            : "";
        const reportsText = dashboard.reports
          .map((r) => this.formatAnalyticsReport(r))
          .join("\n\n---\n\n");
        return `📊 **Tổng quan hệ thống**\n_${dashboard.overview.reportTime}_${alertText}\n\n${reportsText}`;
      }

      return this.formatAnalyticsReport(report);
    } catch (error) {
      console.error("Analytics detection error:", error);
      return null;
    }
  }

  private formatAnalyticsReport(report: {
    title: string;
    summary: string;
    metrics: Record<string, string | number>;
    trends: string[];
    recommendations: string[];
  }): string {
    const metricsText = Object.entries(report.metrics)
      .map(([key, value]) => `- **${key}:** ${value}`)
      .join("\n");
    const trendsText =
      report.trends.length > 0
        ? `\n\n📈 **Xu hướng:**\n${report.trends.map((t) => `- ${t}`).join("\n")}`
        : "";
    const recommendationsText =
      report.recommendations.length > 0
        ? `\n\n💡 **Khuyến nghị:**\n${report.recommendations.map((r) => `- ${r}`).join("\n")}`
        : "";

    return `📊 **${report.title}**\n\n${report.summary}\n\n📌 **Chỉ số:**\n${metricsText}${trendsText}${recommendationsText}`;
  }

  private async callGeminiAI(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: { text: systemPrompt } },
          contents: [
            {
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        console.error("Gemini API error:", error);
        return `❌ Lỗi từ API AI: ${error?.error?.message || "Unknown error"}`;
      }

      const data = (await response.json()) as any;
      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        return "❌ Không nhận được phản hồi từ AI. Vui lòng thử lại.";
      }

      return aiResponse;
    } catch (error) {
      console.error("Gemini API call error:", error);
      throw error;
    }
  }
}