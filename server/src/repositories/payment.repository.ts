import prisma from "../config/db";

export class PaymentRepository {
  async findById(id: number) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            booth: true,
            customer: true
          }
        },
        invoice: true
      }
    });
  }

  async findByCode(paymentCode: string) {
    return prisma.payment.findUnique({
      where: { paymentCode }
    });
  }

  async create(data: any) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data
      });

      // Update linked invoice status to paid if payment completes
      if (data.status === "completed" && data.invoiceId) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: "paid" }
        });
      }
      return payment;
    });
  }

  async update(id: number, data: any) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data
      });

      if (payment.status === "completed" && payment.invoiceId) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: "paid" }
        });
      }
      return payment;
    });
  }

  async delete(id: number) {
    return prisma.payment.delete({
      where: { id }
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    contractId?: number;
    paymentMethod?: string;
  }) {
    const { page, limit, search, status, contractId, paymentMethod } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.paymentCode = { contains: search };
    }

    if (status) {
      where.status = status;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          contract: {
            include: {
              booth: true,
              customer: true
            }
          },
          invoice: true
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { total, items };
  }
}
