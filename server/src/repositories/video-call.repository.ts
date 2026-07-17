import prisma from "../config/db";

export class VideoCallRepository {
  async findById(id: number) {
    return prisma.videoCall.findUnique({
      where: { id },
      include: {
        caller: { select: { id: true, username: true, email: true, avatar: true } },
        receiver: { select: { id: true, username: true, email: true, avatar: true } }
      }
    });
  }

  async create(data: {
    callerId: number;
    receiverId: number;
    status: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }) {
    return prisma.videoCall.create({ data });
  }

  async update(id: number, data: {
    status?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }) {
    return prisma.videoCall.update({ where: { id }, data });
  }

  async findByUser(userId: number, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ callerId: userId }, { receiverId: userId }]
    };

    const [total, items] = await Promise.all([
      prisma.videoCall.count({ where }),
      prisma.videoCall.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          caller: { select: { id: true, username: true, email: true, avatar: true } },
          receiver: { select: { id: true, username: true, email: true, avatar: true } }
        }
      })
    ]);

    return { total, items };
  }
}
