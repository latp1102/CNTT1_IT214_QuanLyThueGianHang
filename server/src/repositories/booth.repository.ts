import prisma from "../config/db";

export class BoothRepository {
  async findById(id: number) {
    return prisma.booth.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            customer: true
          }
        }
      }
    });
  }

  async create(data: any) {
    return prisma.booth.create({
      data
    });
  }

  async update(id: number, data: any) {
    return prisma.booth.update({
      where: { id },
      data
    });
  }

  async delete(id: number) {
    return prisma.booth.delete({
      where: { id }
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    floor?: number;
    zone?: string;
    status?: string;
    minArea?: number;
    maxArea?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      page,
      limit,
      search,
      floor,
      zone,
      status,
      minArea,
      maxArea,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = params;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.name = { contains: search };
    }

    if (floor !== undefined) {
      where.floor = floor;
    }

    if (zone) {
      where.zone = zone;
    }

    if (status) {
      where.status = status;
    }

    if (minArea !== undefined || maxArea !== undefined) {
      where.area = {};
      if (minArea !== undefined) where.area.gte = minArea;
      if (maxArea !== undefined) where.area.lte = maxArea;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const [total, items] = await Promise.all([
      prisma.booth.count({ where }),
      prisma.booth.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      })
    ]);

    return { total, items };
  }
}
