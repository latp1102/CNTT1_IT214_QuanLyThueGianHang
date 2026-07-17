import prisma from "../config/db";

function predictNextMonths(data: { month: number; revenue: number }[], monthsAhead: number): { month: string; actual: number | null; predicted: boolean; revenue: number }[] {
  if (data.length < 2) return [];

  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.month, 0);
  const sumY = data.reduce((s, d) => s + d.revenue, 0);
  const sumXY = data.reduce((s, d) => s + d.month * d.revenue, 0);
  const sumX2 = data.reduce((s, d) => s + d.month * d.month, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n || 0;

  const result: { month: string; actual: number | null; predicted: boolean; revenue: number }[] = [];
  const currentMonth = new Date().getMonth();

  data.forEach((d) => {
    const monthNames = ["Th 1", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "Th 8", "Th 9", "Th 10", "Th 11", "Th 12"];
    result.push({ month: monthNames[d.month - 1], actual: d.revenue, predicted: false, revenue: d.revenue });
  });

  for (let i = 1; i <= monthsAhead; i++) {
    const nextMonth = currentMonth + i + 1;
    const predictedRevenue = Math.max(0, Math.round(slope * nextMonth + intercept));
    const monthNames = ["Th 1", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "Th 8", "Th 9", "Th 10", "Th 11", "Th 12"];
    result.push({ month: monthNames[(currentMonth + i) % 12], actual: null, predicted: true, revenue: predictedRevenue });
  }

  return result;
}

export class ReportService {
  async getDashboardStats(user?: any) {
    if (user && user.roles.includes("customer")) {
      const customer = await prisma.customer.findUnique({
        where: { userId: user.id }
      });

      if (!customer) {
        return {
          stats: {
            totalRevenue: 0,
            totalBooths: 0,
            totalCustomers: 0,
            totalContracts: 0
          },
          boothStatus: [],
          revenueChart: [],
          notifications: []
        };
      }

      const [myActiveContracts, myPayments] = await Promise.all([
        prisma.contract.count({ where: { customerId: customer.id, status: "active" } }),
        prisma.payment.findMany({
          where: { contract: { customerId: customer.id }, status: "completed" },
          select: { amount: true, paymentDate: true }
        })
      ]);

      const myTotalPaid = myPayments.reduce((sum, p) => sum + p.amount, 0);

      const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
        month: `Tháng ${i + 1}`,
        revenue: 0
      }));
      myPayments.forEach((payment) => {
        if (payment.paymentDate) {
          const month = new Date(payment.paymentDate).getMonth();
          monthlyRevenue[month].revenue += payment.amount;
        }
      });

      return {
        stats: {
          totalRevenue: myTotalPaid,
          totalBooths: myActiveContracts,
          totalCustomers: 1,
          totalContracts: myActiveContracts
        },
        boothStatus: [
          { name: "Đang thuê", value: myActiveContracts, color: "#1e90ff" },
          { name: "Còn trống", value: 0, color: "#2ed573" },
          { name: "Bảo trì", value: 0, color: "#ff4757" }
        ],
        revenueChart: monthlyRevenue.map((r) => ({ ...r, actual: r.revenue, predicted: false })),
        notifications: await prisma.notification.findMany({
          where: { userId: user.id },
          take: 5,
          orderBy: { createdAt: "desc" }
        }),
        alerts: {
          expiringContracts: [],
          overdueInvoices: []
        }
      };
    }

    const [totalBooths, totalCustomers, totalContracts, completedPayments] = await Promise.all([
      prisma.booth.count(),
      prisma.customer.count({ where: { status: "active" } }),
      prisma.contract.count({ where: { status: "active" } }),
      prisma.payment.findMany({
        where: { status: "completed" },
        select: { amount: true }
      })
    ]);

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const boothStatusData = await prisma.booth.groupBy({
      by: ["status"],
      _count: {
        id: true
      }
    });

    const statusCounts = {
      available: 0,
      rented: 0,
      maintenance: 0
    };

    boothStatusData.forEach((item) => {
      const status = item.status as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] = item._count.id;
      }
    });

    const currentYear = new Date().getFullYear();
    const paymentsThisYear = await prisma.payment.findMany({
      where: {
        status: "completed",
        paymentDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31)
        }
      },
      select: {
        amount: true,
        paymentDate: true
      }
    });

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: `Tháng ${i + 1}`,
      revenue: 0
    }));

    paymentsThisYear.forEach((payment) => {
      const month = new Date(payment.paymentDate).getMonth();
      monthlyRevenue[month].revenue += payment.amount;
    });

    const recentNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: "desc" }
    });

    const monthlyData = monthlyRevenue.map((r, i) => ({ month: i + 1, revenue: r.revenue }));
    const predictedRevenue = predictNextMonths(monthlyData, 3);

    const expiringContracts = await prisma.contract.findMany({
      where: {
        status: "active",
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: { customer: { select: { name: true } }, booth: { select: { name: true } } },
      orderBy: { endDate: "asc" },
      take: 5
    });

    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: "unpaid", dueDate: { lt: new Date() } },
      include: { contract: { select: { contractCode: true } } },
      take: 5
    });

    return {
      stats: {
        totalRevenue,
        totalBooths,
        totalCustomers,
        totalContracts
      },
      boothStatus: [
        { name: "Còn trống", value: statusCounts.available, color: "#2ed573" },
        { name: "Đang thuê", value: statusCounts.rented, color: "#1e90ff" },
        { name: "Bảo trì", value: statusCounts.maintenance, color: "#ff4757" }
      ],
      revenueChart: predictedRevenue,
      notifications: recentNotifications,
      alerts: {
        expiringContracts: expiringContracts.map((c) => ({
          id: c.id,
          contractCode: c.contractCode,
          customerName: c.customer.name,
          boothName: c.booth.name,
          endDate: c.endDate
        })),
        overdueInvoices: overdueInvoices.map((i) => ({
          id: i.id,
          invoiceCode: i.invoiceCode,
          contractCode: i.contract.contractCode,
          amount: i.amount,
          dueDate: i.dueDate
        }))
      }
    };
  }

  async getRevenueReport(params: { year: number; type: "monthly" | "quarterly" | "yearly" }) {
    const year = params.year || new Date().getFullYear();
    const type = params.type || "monthly";

    const payments = await prisma.payment.findMany({
      where: {
        status: "completed",
        paymentDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31)
        }
      },
      select: {
        amount: true,
        paymentDate: true
      }
    });

    if (type === "yearly") {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      return [{ label: `Năm ${year}`, revenue: total }];
    }

    if (type === "quarterly") {
      const quarterlyRevenue = [
        { label: "Quý 1", revenue: 0 },
        { label: "Quý 2", revenue: 0 },
        { label: "Quý 3", revenue: 0 },
        { label: "Quý 4", revenue: 0 }
      ];

      payments.forEach((p) => {
        const month = new Date(p.paymentDate).getMonth();
        const quarter = Math.floor(month / 3);
        quarterlyRevenue[quarter].revenue += p.amount;
      });

      return quarterlyRevenue;
    }

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      label: `Tháng ${i + 1}`,
      revenue: 0
    }));

    payments.forEach((p) => {
      const month = new Date(p.paymentDate).getMonth();
      monthlyRevenue[month].revenue += p.amount;
    });

    return monthlyRevenue;
  }

  async getTopCustomers(limit = 5) {
    const customers = await prisma.customer.findMany({
      include: {
        contracts: {
          include: {
            payments: {
              where: { status: "completed" }
            }
          }
        }
      }
    });

    const result = customers.map((c) => {
      const totalPaid = c.contracts.reduce((sum, contract) => {
        const contractTotal = contract.payments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + contractTotal;
      }, 0);

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        totalPaid
      };
    });

    return result.sort((a, b) => b.totalPaid - a.totalPaid).slice(0, limit);
  }

  async getTopBooths(limit = 5) {
    const booths = await prisma.booth.findMany({
      include: {
        contracts: {
          include: {
            payments: {
              where: { status: "completed" }
            }
          }
        }
      }
    });

    const result = booths.map((b) => {
      const totalRevenue = b.contracts.reduce((sum, contract) => {
        const contractTotal = contract.payments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + contractTotal;
      }, 0);

      return {
        id: b.id,
        name: b.name,
        floor: b.floor,
        zone: b.zone,
        totalRevenue
      };
    });

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit);
  }
}
