import prisma from "../config/db";

export class InvoiceRepository {
  async findById(id: number) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            booth: true,
            customer: true
          }
        },
        payments: true
      }
    });
  }

  async findByCode(invoiceCode: string) {
    return prisma.invoice.findUnique({
      where: { invoiceCode }
    });
  }

  async create(data: any) {
    return prisma.invoice.create({
      data
    });
  }

  async update(id: number, data: any) {
    return prisma.invoice.update({
      where: { id },
      data
    });
  }

  async delete(id: number) {
    return prisma.invoice.delete({
      where: { id }
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    contractId?: number;
  }) {
    const { page, limit, search, status, contractId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceCode: { contains: search } },
        { title: { contains: search } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          contract: {
            include: {
              booth: true,
              customer: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { total, items };
  }
}
