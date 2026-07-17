import prisma from "../config/db";

interface RetrievalContext {
  type:
    | "booths"
    | "contracts"
    | "invoices"
    | "customers"
    | "payments"
    | "general";
  data: any;
  query: string;
}

export class ChatRAGService {
  /**
   * Helper: Format date to dd/MM/yyyy
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Helper: Format date to dd/MM/yyyy HH:mm
   */
  private formatDateTime(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  /**
   * Helper: Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Calculate days until a date
   */
  private daysUntil(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Calculate days overdue
   */
  private daysOverdue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = today.getTime() - due.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Phân tích câu hỏi và lấy dữ liệu liên quan từ database
   */
  async retrieveContext(userMessage: string): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();

    // Detect intent và retrieve dữ liệu tương ứng
    if (
      this.matchIntent(lowerMsg, [
        "gian hàng",
        "booth",
        "phòng",
        "cửa hàng",
        "trống",
        "còn trống",
      ])
    ) {
      return this.getBoothContext(userMessage);
    }

    if (
      this.matchIntent(lowerMsg, [
        "hợp đồng",
        "contract",
        "ký kết",
        "thanh lý",
        "hết hạn",
        "sắp hết",
      ])
    ) {
      return this.getContractContext(userMessage);
    }

    if (
      this.matchIntent(lowerMsg, [
        "hóa đơn",
        "invoice",
        "quá hạn",
        "chưa thanh toán",
        "thanh toán",
        "đóng tiền",
      ])
    ) {
      return this.getInvoiceContext(userMessage);
    }

    if (
      this.matchIntent(lowerMsg, [
        "khách",
        "customer",
        "khách thuê",
        "đối tác",
        "doanh nghiệp",
      ])
    ) {
      return this.getCustomerContext(userMessage);
    }

    if (
      this.matchIntent(lowerMsg, ["thanh toán", "payment", "giao dịch", "tiền"])
    ) {
      return this.getPaymentContext(userMessage);
    }

    return { type: "general", data: null, query: userMessage };
  }

  private matchIntent(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }

  private async getBoothContext(
    userMessage: string,
  ): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();
    let booths;

    if (this.matchIntent(lowerMsg, ["trống", "còn trống", "available"])) {
      booths = await prisma.booth.findMany({
        where: { status: "available" },
        orderBy: { price: "asc" },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["đang thuê", "rented"])) {
      booths = await prisma.booth.findMany({
        where: { status: "rented" },
        include: {
          contracts: {
            where: { status: "active" },
            include: { customer: true },
          },
        },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["bảo trì", "maintenance"])) {
      booths = await prisma.booth.findMany({
        where: { status: "maintenance" },
        take: 10,
      });
    } else if (
      this.matchIntent(lowerMsg, ["tầng", "floor"]) &&
      /\d+/.test(userMessage)
    ) {
      const floor = parseInt(userMessage.match(/\d+/)?.[0] || "0");
      booths = await prisma.booth.findMany({
        where: { floor },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["khu vực", "zone", "area"])) {
      const zones = await prisma.booth.findMany({
        select: { zone: true },
      });
      const uniqueZones = [...new Set(zones.map((b) => b.zone))];
      return {
        type: "booths",
        data: { zones: uniqueZones },
        query: userMessage,
      };
    } else {
      booths = await prisma.booth.findMany({ take: 10 });
    }

    return {
      type: "booths",
      data: booths.map((b) => ({
        id: b.id,
        name: b.name,
        floor: b.floor,
        zone: b.zone,
        area: b.area,
        price: b.price,
        status: b.status,
        description: b.description,
      })),
      query: userMessage,
    };
  }

  private async getContractContext(
    userMessage: string,
  ): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();
    let contracts;

    if (
      this.matchIntent(lowerMsg, [
        "sắp hết",
        "hết hạn",
        "expiring",
        "expiring soon",
      ])
    ) {
      const nextMonth = this.addDays(new Date(), 30);
      contracts = await prisma.contract.findMany({
        where: {
          status: "active",
          endDate: { lte: nextMonth },
        },
        include: {
          customer: true,
          booth: true,
        },
        orderBy: { endDate: "asc" },
        take: 10,
      });
    } else if (
      this.matchIntent(lowerMsg, ["hoạt động", "active", "đang hoạt động"])
    ) {
      contracts = await prisma.contract.findMany({
        where: { status: "active" },
        include: { customer: true, booth: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["hết hạn", "expired"])) {
      contracts = await prisma.contract.findMany({
        where: { status: "expired" },
        include: { customer: true, booth: true },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["thanh lý", "terminated"])) {
      contracts = await prisma.contract.findMany({
        where: { status: "terminated" },
        include: { customer: true, booth: true },
        take: 10,
      });
    } else {
      contracts = await prisma.contract.findMany({
        include: { customer: true, booth: true },
        take: 10,
      });
    }

    return {
      type: "contracts",
      data: contracts.map((c) => ({
        id: c.id,
        code: c.contractCode,
        customer: c.customer.name,
        booth: c.booth?.name,
        status: c.status,
        startDate: this.formatDate(c.startDate),
        endDate: this.formatDate(c.endDate),
        deposit: c.deposit,
        daysUntilExpiry: this.daysUntil(c.endDate),
      })),
      query: userMessage,
    };
  }

  private async getInvoiceContext(
    userMessage: string,
  ): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();
    let invoices;

    if (this.matchIntent(lowerMsg, ["quá hạn", "overdue", "chưa thanh toán"])) {
      invoices = await prisma.invoice.findMany({
        where: { status: "overdue" },
        include: {
          contract: { include: { customer: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["chưa thanh toán", "unpaid"])) {
      invoices = await prisma.invoice.findMany({
        where: { status: "unpaid" },
        include: { contract: { include: { customer: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["thanh toán", "paid"])) {
      invoices = await prisma.invoice.findMany({
        where: { status: "paid" },
        include: { contract: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } else {
      invoices = await prisma.invoice.findMany({
        include: { contract: { include: { customer: true } } },
        take: 10,
      });
    }

    return {
      type: "invoices",
      data: invoices.map((inv) => ({
        id: inv.id,
        code: inv.invoiceCode,
        customer: inv.contract.customer.name,
        amount: inv.amount,
        status: inv.status,
        dueDate: this.formatDate(inv.dueDate),
        title: inv.title,
        daysOverdue:
          inv.status === "overdue" ? this.daysOverdue(inv.dueDate) : 0,
      })),
      query: userMessage,
    };
  }

  private async getCustomerContext(
    userMessage: string,
  ): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();
    let customers;

    if (this.matchIntent(lowerMsg, ["hoạt động", "active"])) {
      customers = await prisma.customer.findMany({
        where: { status: "active" },
        include: { contracts: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } else if (
      this.matchIntent(lowerMsg, ["không hoạt động", "inactive", "vô hiệu"])
    ) {
      customers = await prisma.customer.findMany({
        where: { status: "inactive" },
        include: { contracts: true },
        take: 10,
      });
    } else if (
      this.matchIntent(lowerMsg, [
        "nhiều hợp đồng",
        "nhiều gian",
        "contract count",
      ])
    ) {
      customers = await prisma.customer.findMany({
        include: { contracts: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } else {
      customers = await prisma.customer.findMany({
        include: { contracts: true },
        take: 10,
      });
    }

    return {
      type: "customers",
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        idCard: c.idCard,
        status: c.status,
        company: c.company,
        contractCount: c.contracts?.length || 0,
      })),
      query: userMessage,
    };
  }

  private async getPaymentContext(
    userMessage: string,
  ): Promise<RetrievalContext> {
    const lowerMsg = userMessage.toLowerCase();
    let payments;

    if (this.matchIntent(lowerMsg, ["thành công", "completed", "hoàn thành"])) {
      payments = await prisma.payment.findMany({
        where: { status: "completed" },
        include: { contract: { include: { customer: true } } },
        orderBy: { paymentDate: "desc" },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["chưa thanh toán", "pending"])) {
      payments = await prisma.payment.findMany({
        where: { status: "pending" },
        include: { contract: { include: { customer: true } } },
        take: 10,
      });
    } else if (this.matchIntent(lowerMsg, ["thất bại", "failed"])) {
      payments = await prisma.payment.findMany({
        where: { status: "failed" },
        include: { contract: { include: { customer: true } } },
        take: 10,
      });
    } else {
      payments = await prisma.payment.findMany({
        include: { contract: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    }

    return {
      type: "payments",
      data: payments.map((p) => ({
        id: p.id,
        code: p.paymentCode,
        customer: p.contract.customer.name,
        amount: p.amount,
        status: p.status,
        method: p.paymentMethod,
        paymentDate: p.paymentDate ? this.formatDateTime(p.paymentDate) : null,
      })),
      query: userMessage,
    };
  }
}
