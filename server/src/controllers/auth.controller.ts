import { Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { HTTP_STATUS } from "../constants";
import { AuthenticatedRequest } from "../models";

export class AuthController {
  private authService = new AuthService();

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Đăng nhập thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Đăng ký tài khoản thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Vui lòng cung cấp mã làm mới (Refresh Token)."
        });
      }
      const result = await this.authService.refreshToken(refreshToken);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Làm mới mã truy cập thành công.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify reset code
  verifyResetCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      const result = await this.authService.verifyResetCode(email, code);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.success ? "Mã xác thực hợp lệ." : "Mã xác thực không hợp lệ.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resetPassword(req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Yêu cầu xác thực quyền sở hữu tài khoản."
        });
      }
      const result = await this.authService.changePassword(req.user.id, req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Yêu cầu xác thực tài khoản."
        });
      }
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Tải thông tin hồ sơ thành công.",
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=auth_failed`);
      }
      const result = this.authService.generateTokensForUser(user);
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        roles: user.roles || [],
        permissions: user.permissions || []
      };
      const encodedUser = encodeURIComponent(JSON.stringify(userData));
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodedUser}`);
    } catch (error) {
      next(error);
    }
  };

  facebookCallback = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=auth_failed`);
      }
      const result = this.authService.generateTokensForUser(user);
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        roles: user.roles || [],
        permissions: user.permissions || []
      };
      const encodedUser = encodeURIComponent(JSON.stringify(userData));
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodedUser}`);
    } catch (error) {
      next(error);
    }
  };
}
