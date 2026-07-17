import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import transporter from "../config/mailer";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "booth_rental_access_secret_key_123456";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "booth_rental_refresh_secret_key_123456";

export class AuthService {
  private userRepository = new UserRepository();
  private passwordResetCodes = new Map<string, { code: string; expires: number }>();

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateTokensForUser(user: any) {
    return this.generateTokens(user);
  }

  private generateTokens(user: any) {
    const roles = user.roles || user.userRoles?.map((ur: any) => ur.role.name) || [];
    const permissions = user.permissions || user.userRoles?.flatMap((ur: any) =>
      ur.role.rolePermissions?.map((rp: any) => rp.permission.name) || []
    ) || [];

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || null,
      roles,
      permissions
    };

    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    return { accessToken, refreshToken };
  }

  async login(dto: any) {
    const { username, password } = dto;
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new AppError("Tài khoản hoặc mật khẩu không chính xác.", HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.status !== "active") {
      throw new AppError("Tài khoản của bạn đã bị khóa.", HTTP_STATUS.FORBIDDEN);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Tài khoản hoặc mật khẩu không chính xác.", HTTP_STATUS.UNAUTHORIZED);
    }

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        roles: user.userRoles.map((ur: any) => ur.role.name),
        permissions: user.userRoles.flatMap((ur: any) =>
          ur.role.rolePermissions.map((rp: any) => rp.permission.name)
        )
      },
      ...tokens
    };
  }

  async register(dto: any) {
    const { username, email, password } = dto;

    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppError("Tên tài khoản đã tồn tại.", HTTP_STATUS.CONFLICT);
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new AppError("Email đã tồn tại trong hệ thống.", HTTP_STATUS.CONFLICT);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get default role for registering user (usually "customer" role)
    const roles = await this.userRepository.getRoles();
    const customerRole = roles.find((r) => r.name === "customer");
    const roleId = customerRole ? customerRole.id : 4; // default to customer role id

    const user = await this.userRepository.create(
      {
        username,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        status: "active"
      },
      roleId
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      const user = await this.userRepository.findById(decoded.id);

      if (!user) {
        throw new AppError("Người dùng không hợp lệ.", HTTP_STATUS.UNAUTHORIZED);
      }

      if (user.status !== "active") {
        throw new AppError("Tài khoản đã bị khóa.", HTTP_STATUS.FORBIDDEN);
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new AppError("Mã làm mới (Refresh Token) không hợp lệ hoặc đã hết hạn.", HTTP_STATUS.UNAUTHORIZED);
    }
  }

  async forgotPassword(email: string) {
    const code = this.generateVerificationCode();
    const expires = Date.now() + 15 * 60 * 1000;
    this.passwordResetCodes.set(email, { code, expires });

    try {
      await transporter.sendMail({
        from: `"Hệ thống Quản lý Gian Hàng" <${process.env.EMAIL_USER || "noreply@boothrental.com"}>`,
        to: email,
        subject: "Mã xác thực khôi phục mật khẩu",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">KHÔI PHỤC MẬT KHẨU</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Hệ thống Quản lý Thuê Gian hàng</p>
            </div>
            <div style="padding: 32px 24px; background: #ffffff;">
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>. 
                Sử dụng mã xác thực dưới đây để tiếp tục:
              </p>
              <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f1f5f9; border-radius: 10px; letter-spacing: 12px; font-size: 32px; font-weight: 800; color: #4f46e5;">
                ${code}
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
                Mã xác thực có hiệu lực trong <strong>15 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
              </p>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
              </p>
            </div>
            <div style="padding: 16px 24px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 Hệ thống Quản lý Thuê Gian hàng Thương mại</p>
            </div>
          </div>
        `
      });
      console.log(`[DEV] Email sent to ${email} with code: ${code}`);
    } catch (mailError: any) {
      console.warn(`[DEV] Không gửi được email tới ${email}, mã code: ${code}`);
      console.warn(`[DEV] Lỗi SMTP:`, mailError.response || mailError.message);
    }

    return { message: "Mã xác thực đã được gửi vào email của bạn." };
  }
  async verifyResetCode(email: string, code: string) {
    const entry = this.passwordResetCodes.get(email);
    if (!entry) {
      throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn.", HTTP_STATUS.BAD_REQUEST);
    }
    if (Date.now() > entry.expires) {
      this.passwordResetCodes.delete(email);
      throw new AppError("Mã xác thực đã hết hạn.", HTTP_STATUS.BAD_REQUEST);
    }
    if (entry.code !== code) {
      throw new AppError("Mã xác thực không đúng.", HTTP_STATUS.BAD_REQUEST);
    }
    this.passwordResetCodes.delete(email);

    const resetToken = jwt.sign(
      { id: email, purpose: "password_reset" },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return { success: true, resetToken };
  }

  async resetPassword(dto: any) {
    const { token, newPassword } = dto;

    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      let userId: number;
      if (decoded.purpose === "password_reset") {
        const user = await this.userRepository.findByEmail(decoded.id);
        if (!user) {
          throw new AppError("Người dùng không tồn tại.", HTTP_STATUS.NOT_FOUND);
        }
        userId = user.id;
      } else {
        userId = decoded.id;
      }

      await this.userRepository.update(userId, {
        password: hashedPassword
      });

      return { message: "Đặt lại mật khẩu thành công." };
    } catch (error) {
      throw new AppError("Liên kết khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.", HTTP_STATUS.BAD_REQUEST);
    }
  }

  async changePassword(userId: number, dto: any) {
    const { currentPassword, newPassword } = dto;
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Người dùng không hợp lệ.", HTTP_STATUS.UNAUTHORIZED);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError("Mật khẩu hiện tại không chính xác.", HTTP_STATUS.BAD_REQUEST);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(userId, {
      password: hashedPassword
    });

    return { message: "Đổi mật khẩu thành công." };
  }
}
