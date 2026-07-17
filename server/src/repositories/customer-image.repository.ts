import prisma from "../config/db";

export class CustomerImageRepository {
  async findByCustomerId(customerId: number) {
    return prisma.customerImage.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(data: { customerId: number; imageUrl: string; caption?: string }) {
    return prisma.customerImage.create({ data });
  }

  async createMany(data: { customerId: number; imageUrl: string; caption?: string }[]) {
    return prisma.customerImage.createMany({ data });
  }

  async delete(id: number) {
    return prisma.customerImage.delete({ where: { id } });
  }

  async deleteByCustomerId(customerId: number) {
    return prisma.customerImage.deleteMany({ where: { customerId } });
  }
}
