import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../models";

export const loggerMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

    // Console logging
    console.log(`[${req.method}] ${req.originalUrl} - ${statusCode} (${duration}ms) - IP: ${ipAddress}`);

    // Log modifying requests to database
    const modifyingMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (modifyingMethods.includes(req.method) && req.user && statusCode < 400) {
      try {
        // Obfuscate sensitive credentials
        let bodyContent = { ...req.body };
        if (bodyContent.password) bodyContent.password = "********";
        if (bodyContent.passwordConfirm) bodyContent.passwordConfirm = "********";

        await prisma.log.create({
          data: {
            userId: req.user.id,
            action: `${req.method} ${req.route?.path || req.path}`,
            details: JSON.stringify({
              url: req.originalUrl,
              query: req.query,
              body: bodyContent,
              statusCode
            }),
            ipAddress
          }
        });
      } catch (err) {
        console.error("Lỗi khi ghi nhật ký hoạt động vào cơ sở dữ liệu:", err);
      }
    }
  });

  next();
};
