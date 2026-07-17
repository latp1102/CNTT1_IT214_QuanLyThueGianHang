import prisma from "../config/db";

export class ContractRepository {
  async findById(id: number) {
    return prisma.contract.findUnique({
      where: { id },
      include: {
        booth: true,
        customer: true,
        payments: true,
        invoices: true
      }
    });
  }

  async findByCode(contractCode: string) {
    return prisma.contract.findUnique({
      where: { contractCode },
      include: {
        booth: true,
        customer: true
      }
    });
  }

  async create(data: any) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data
      });
      // Automatically update booth status to rented
      await tx.booth.update({
        where: { id: data.boothId },
        data: { status: "rented" }
      });
      return contract;
    });
  }

  async update(id: number, data: any) {
    return prisma.contract.update({
      where: { id },
      data
    });
  }

  async terminate(id: number, boothId: number) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.update({
        where: { id },
        data: { status: "terminated" }
      });
      // Free the booth
      await tx.booth.update({
        where: { id: boothId },
        data: { status: "available" }
      });
      return contract;
    });
  }

  async delete(id: number, boothId: number) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.delete({
        where: { id }
      });
      // Free the booth
      await tx.booth.update({
        where: { id: boothId },
        data: { status: "available" }
      });
      return contract;
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    customerId?: number;
    boothId?: number;
  }) {
    const { page, limit, search, status, customerId, boothId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.contractCode = { contains: search };
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (boothId) {
      where.boothId = boothId;
    }

    const [total, items] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        include: {
          booth: true,
          customer: true
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { total, items };
  }
}
