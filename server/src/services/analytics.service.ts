import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AnalyticsReport {
  title: string;
  summary: string;
  metrics: Record<string, string | number>;
  trends: string[];
  recommendations: string[];
}

export class AnalyticsService {
  /**
   * Generate revenue analytics report
   */
  async generateRevenueAnalytics(): Promise<AnalyticsReport> {
    const invoices = await prisma.invoice.findMany({
      select: {
        amount: true,
        status: true,
        createdAt: true,
        dueDate: true,
      },
    });

    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidRevenue = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const overdueAmount = invoices
      .filter(
        (inv) =>
          (inv.status === "overdue" ||
            (inv.status === "unpaid" && new Date(inv.dueDate) < new Date())),
      )
      .reduce((sum, inv) => sum + inv.amount, 0);
    const averageInvoice =
      invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // Monthly trend (last 6 months)
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("vi-VN", {
        month: "2-digit",
        year: "numeric",
      });
      monthlyData[monthKey] = 0;
    }

    invoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      const monthKey = date.toLocaleDateString("vi-VN", {
        month: "2-digit",
        year: "numeric",
      });
      if (monthKey in monthlyData && inv.status === "paid") {
        monthlyData[monthKey] += inv.amount;
      }
    });

    const trends = Object.entries(monthlyData).map(
      ([month, amount]) => `${month}: ${amount.toLocaleString("vi-VN")} đ`,
    );

    // Recommendations
    const recommendations: string[] = [];
    if (overdueAmount > 0) {
      recommendations.push(
        `⚠️ Có ${(overdueAmount / 1000000).toFixed(2)}M đ hóa đơn quá hạn cần thu`,
      );
    }
    const paidRate =
      invoices.length > 0 ? (paidRevenue / totalRevenue) * 100 : 0;
    if (paidRate < 80) {
      recommendations.push(
        `📉 Tỷ lệ thanh toán ${paidRate.toFixed(1)}% - cần theo dõi sát hơn`,
      );
    }
    if (totalRevenue > 0) {
      recommendations.push(
        `✅ Doanh thu trung bình: ${(averageInvoice / 1000000).toFixed(2)}M đ/hóa đơn`,
      );
    }

    return {
      title: "Báo cáo Doanh thu",
      summary: `Tổng doanh thu: ${(totalRevenue / 1000000).toFixed(2)}M đ | Đã thu: ${(paidRevenue / 1000000).toFixed(2)}M đ | Quá hạn: ${(overdueAmount / 1000000).toFixed(2)}M đ`,
      metrics: {
        "Tổng doanh thu": `${(totalRevenue / 1000000).toFixed(2)}M đ`,
        "Đã thanh toán": `${(paidRevenue / 1000000).toFixed(2)}M đ`,
        "Quá hạn": `${(overdueAmount / 1000000).toFixed(2)}M đ`,
        "Tỷ lệ thanh toán": `${paidRate.toFixed(1)}%`,
        "Hóa đơn trung bình": `${(averageInvoice / 1000000).toFixed(2)}M đ`,
      },
      trends,
      recommendations,
    };
  }

  /**
   * Generate booth occupancy analytics
   */
  async generateBoothAnalytics(): Promise<AnalyticsReport> {
    const booths = await prisma.booth.findMany({
      include: {
        contracts: {
          where: {
            status: "active",
          },
        },
      },
    });

    const totalBooths = booths.length;
    const occupiedBooths = booths.filter((b) => b.contracts.length > 0).length;
    const emptyBooths = totalBooths - occupiedBooths;
    const occupancyRate =
      totalBooths > 0 ? (occupiedBooths / totalBooths) * 100 : 0;

    // By floor
    const byFloor: Record<string, { total: number; occupied: number }> = {};
    booths.forEach((booth) => {
      const floor = booth.floor || "Chưa xác định";
      if (!byFloor[floor]) {
        byFloor[floor] = { total: 0, occupied: 0 };
      }
      byFloor[floor].total++;
      if (booth.contracts.length > 0) {
        byFloor[floor].occupied++;
      }
    });

    const trends = Object.entries(byFloor)
      .map(
        ([floor, data]) =>
          `Tầng ${floor}: ${data.occupied}/${data.total} (${((data.occupied / data.total) * 100).toFixed(0)}%)`,
      )
      .sort();

    const recommendations: string[] = [];
    if (occupancyRate < 50) {
      recommendations.push(
        `📉 Tỷ lệ lấp đầy ${occupancyRate.toFixed(0)}% - cần chiến dịch marketing`,
      );
    } else if (occupancyRate > 90) {
      recommendations.push(
        `🔥 Lấp đầy ${occupancyRate.toFixed(0)}% - có thể tăng giá thuê`,
      );
    }
    recommendations.push(
      `📋 Gian hàng trống: ${emptyBooths} chỗ sẵn sàng cho thuê`,
    );

    return {
      title: "Báo cáo Lấp đầy Gian hàng",
      summary: `Lấp đầy: ${occupiedBooths}/${totalBooths} gian hàng (${occupancyRate.toFixed(1)}%) | Còn trống: ${emptyBooths}`,
      metrics: {
        "Tổng gian hàng": totalBooths,
        "Đã cho thuê": occupiedBooths,
        "Còn trống": emptyBooths,
        "Tỷ lệ lấp đầy": `${occupancyRate.toFixed(1)}%`,
      },
      trends,
      recommendations,
    };
  }

  /**
   * Generate contract analytics
   */
  async generateContractAnalytics(): Promise<AnalyticsReport> {
    const contracts = await prisma.contract.findMany({
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        deposit: true,
      },
    });

    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(
      (c) => c.status === "active",
    ).length;
    const expiredContracts = contracts.filter(
      (c) => c.status === "expired",
    ).length;
    const terminatedContracts = contracts.filter(
      (c) => c.status === "terminated",
    ).length;

    // Contracts expiring soon (next 30 days)
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringsoon = contracts.filter(
      (c) =>
        c.status === "active" &&
        new Date(c.endDate) > now &&
        new Date(c.endDate) <= thirtyDaysLater,
    ).length;

    const recommendations: string[] = [];
    if (expiringsoon > 0) {
      recommendations.push(
        `⏰ ${expiringsoon} hợp đồng sắp hết hạn trong 30 ngày`,
      );
    }
    recommendations.push(
      `📊 Tỷ lệ hợp đồng hoạt động: ${((activeContracts / totalContracts) * 100).toFixed(1)}%`,
    );
    if (expiredContracts > 0) {
      recommendations.push(
        `✓ ${expiredContracts} hợp đồng đã hết hạn (cần gia hạn hoặc chấm dứt)`,
      );
    }

    const trends = [
      `Đang hoạt động: ${activeContracts}`,
      `Đã hết hạn: ${expiredContracts}`,
      `Đã chấm dứt: ${terminatedContracts}`,
      `Sắp hết hạn (30 ngày): ${expiringsoon}`,
    ];

    return {
      title: "Báo cáo Hợp đồng",
      summary: `Tổng: ${totalContracts} | Hoạt động: ${activeContracts} | Hết hạn: ${expiredContracts} | Chấm dứt: ${terminatedContracts}`,
      metrics: {
        "Tổng hợp đồng": totalContracts,
        "Đang hoạt động": activeContracts,
        "Đã hết hạn": expiredContracts,
        "Đã chấm dứt": terminatedContracts,
        "Sắp hết hạn": expiringsoon,
      },
      trends,
      recommendations,
    };
  }

  /**
   * Generate customer analytics
   */
  async generateCustomerAnalytics(): Promise<AnalyticsReport> {
    const customers = await prisma.customer.findMany({
      include: {
        contracts: {
          include: {
            invoices: true,
          },
        },
      },
    });

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) =>
      c.contracts.some((con) => con.status === "active"),
    ).length;
    const inactiveCustomers = totalCustomers - activeCustomers;

    // Top spenders
    const customerSpends = customers
      .map((c) => ({
        name: c.name,
        spend: c.contracts.reduce(
          (sum, con) =>
            sum + con.invoices.reduce((invSum, inv) => invSum + inv.amount, 0),
          0,
        ),
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3);

    const topCustomers = customerSpends
      .map((cs) => `${cs.name}: ${(cs.spend / 1000000).toFixed(2)}M đ`)
      .join(" | ");

    const avgSpendPerCustomer =
      totalCustomers > 0
        ? customerSpends.reduce((sum, cs) => sum + cs.spend, 0) / totalCustomers
        : 0;

    const recommendations: string[] = [];
    recommendations.push(
      `👥 Khách tích cực: ${activeCustomers}/${totalCustomers}`,
    );
    if (inactiveCustomers > 0) {
      recommendations.push(
        `📞 ${inactiveCustomers} khách không hoạt động - cần liên hệ tái khích hoạt`,
      );
    }
    recommendations.push(
      `💰 Chi tiêu trung bình: ${(avgSpendPerCustomer / 1000000).toFixed(2)}M đ/khách`,
    );

    return {
      title: "Báo cáo Khách hàng",
      summary: `Tổng: ${totalCustomers} khách | Tích cực: ${activeCustomers} | Không hoạt động: ${inactiveCustomers}`,
      metrics: {
        "Tổng khách hàng": totalCustomers,
        "Khách tích cực": activeCustomers,
        "Không hoạt động": inactiveCustomers,
        "Khách hàng top": topCustomers || "N/A",
        "Chi tiêu trung bình": `${(avgSpendPerCustomer / 1000000).toFixed(2)}M đ`,
      },
      trends: [
        `Khách tích cực: ${activeCustomers}/${totalCustomers} (${((activeCustomers / totalCustomers) * 100).toFixed(1)}%)`,
        topCustomers
          ? `Khách hàng hàng đầu: ${topCustomers}`
          : "Chưa có dữ liệu",
      ],
      recommendations,
    };
  }

  /**
   * Generate comprehensive dashboard analytics
   */
  async generateDashboard(): Promise<{
    overview: Record<string, string | number>;
    alerts: string[];
    reports: AnalyticsReport[];
  }> {
    const [revenue, booths, contracts, customers] = await Promise.all([
      this.generateRevenueAnalytics(),
      this.generateBoothAnalytics(),
      this.generateContractAnalytics(),
      this.generateCustomerAnalytics(),
    ]);

    // Extract alerts from all reports
    const alerts = [
      ...revenue.recommendations.filter(
        (r) => r.includes("⚠️") || r.includes("📉"),
      ),
      ...booths.recommendations.filter((r) => r.includes("📉")),
      ...contracts.recommendations.filter((r) => r.includes("⏰")),
      ...customers.recommendations.filter((r) => r.includes("📞")),
    ];

    return {
      overview: {
        reportTime: new Date().toLocaleString("vi-VN"),
        totalReports: 4,
      },
      alerts,
      reports: [revenue, booths, contracts, customers],
    };
  }
}

export const analyticsService = new AnalyticsService();
