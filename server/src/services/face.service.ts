import { PrismaClient } from "@prisma/client";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import { AuthService } from "./auth.service";

const prisma = new PrismaClient();
const authService = new AuthService();
const SIMILARITY_THRESHOLD = 0.5;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class FaceService {
  async saveFaceDescriptor(userId: number, descriptor: number[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("Người dùng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { facialId: JSON.stringify(descriptor) },
    });

    return { message: "Đăng ký khuôn mặt thành công!" };
  }

  async loginWithFace(descriptor: number[]) {
    if (!descriptor || descriptor.length === 0) {
      throw new AppError("Không tìm thấy dữ liệu khuôn mặt.", HTTP_STATUS.BAD_REQUEST);
    }

    const users = await prisma.user.findMany({
      where: {
        facialId: { not: null },
        status: "active",
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (users.length === 0) {
      throw new AppError(
        "Chưa có tài khoản nào đăng ký khuôn mặt trong hệ thống.",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    let bestMatch: { user: any; score: number } | null = null;

    for (const user of users) {
      if (!user.facialId) continue;
      try {
        const storedDescriptor = JSON.parse(user.facialId);
        const score = cosineSimilarity(storedDescriptor, descriptor);
        if (score >= SIMILARITY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { user, score };
        }
      } catch {
        continue;
      }
    }

    if (!bestMatch) {
      throw new AppError(
        "Không nhận diện được khuôn mặt. Vui lòng thử lại.",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const user = bestMatch.user;
    const tokens = authService.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        roles: user.userRoles.map((ur: any) => ur.role.name),
        permissions: user.userRoles.flatMap((ur: any) =>
          ur.role.rolePermissions.map((rp: any) => rp.permission.name)
        ),
      },
      ...tokens,
    };
  }
}
