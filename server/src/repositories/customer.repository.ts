import prisma from "../config/db";

export class CustomerRepository {
  async findById(id: number) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        contracts: {
          include: {
            booth: true
          }
        }
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.customer.findUnique({
      where: { email }
    });
  }

  async create(data: any) {
    return prisma.customer.create({
      data
    });
  }

  async update(id: number, data: any) {
    return prisma.customer.update({
      where: { id },
      data
    });
  }

  async delete(id: number) {
    return prisma.customer.delete({
      where: { id }
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { total, items };
  }
}
