import prisma from "../config/db";

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async create(data: any, roleId: number) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data
      });
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId
        }
      });
      return user;
    });
  }

  async update(id: number, data: any) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { total, items };
  }

  async delete(id: number) {
    return prisma.user.delete({
      where: { id }
    });
  }

  async getRoles() {
    return prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async getPermissions() {
    return prisma.permission.findMany();
  }

  async assignRoles(userId: number, roleIds: number[]) {
    return prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId }
      });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId
        }))
      });
      return true;
    });
  }
}
