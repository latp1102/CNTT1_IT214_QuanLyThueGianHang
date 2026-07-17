import prisma from "../config/db";
import { PaymentRepository } from "../repositories/payment.repository";
import { InvoiceRepository } from "../repositories/invoice.repository";
import { ContractRepository } from "../repositories/contract.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import transporter from "../config/mailer";
import { getIO } from "../config/socket";
import { generateVietQR } from "../utils/vietqr";

export class PaymentService {
  private paymentRepository = new PaymentRepository();
  private invoiceRepository = new InvoiceRepository();
  private contractRepository = new ContractRepository();

  async create(dto: any) {
    const { contractId, invoiceId, amount, paymentMethod, status } = dto;

    if (!contractId || amount === undefined || !paymentMethod) {
      throw new AppError("Mã hợp đồng, số tiền và phương thức thanh toán là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const contract = await this.contractRepository.findById(parseInt(contractId));
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    if (invoiceId) {
      const invoice = await this.invoiceRepository.findById(parseInt(invoiceId));
      if (!invoice) {
        throw new AppError("Hóa đơn liên kết không tồn tại.", HTTP_STATUS.NOT_FOUND);
      }
    }

    const cleanCode = contract.contractCode.replace(/\s+/g, "-").toUpperCase();
    const paymentCode = `PAY-${cleanCode}-${Date.now().toString().slice(-4)}`;
    const finalStatus = status || "pending";

    const payment = await this.paymentRepository.create({
      paymentCode,
      contractId: parseInt(contractId),
      invoiceId: invoiceId ? parseInt(invoiceId) : null,
      amount: parseFloat(amount),
      paymentMethod,
      status: finalStatus,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date()
    });

    // Auto-update invoice & send receipt when payment is completed
    if (finalStatus === "completed" && invoiceId) {
      try {
        await this.invoiceRepository.update(parseInt(invoiceId), { status: "paid" });

        const invoice = await this.invoiceRepository.findById(parseInt(invoiceId));
        if (invoice?.contract?.customer?.email) {
          const customerEmail = invoice.contract.customer.email;
          const customerName = invoice.contract.customer.name;
          const boothName = invoice.contract.booth.name;

          await transporter.sendMail({
            from: `"Hệ thống Quản lý Gian Hàng" <${process.env.EMAIL_USER || "noreply@boothrental.com"}>`,
            to: customerEmail,
            subject: `Biên lai thanh toán - ${invoice.invoiceCode}`,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">THANH TOÁN THÀNH CÔNG</h1>
                  <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Biên lai thanh toán điện tử</p>
                </div>
                <div style="padding: 32px 24px; background: #ffffff;">
                  <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                    Xin chào <strong>${customerName}</strong>,
                  </p>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                    Giao dịch thanh toán của bạn đã được ghi nhận thành công.
                  </p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Mã hóa đơn</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${invoice.invoiceCode}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Mã giao dịch</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${paymentCode}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Gian hàng</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${boothName}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Phương thức</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${paymentMethod === "vnpay" ? "VNPay" : paymentMethod === "momo" ? "Ví MoMo" : paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Ngày giao dịch</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date().toLocaleDateString("vi-VN")}</td></tr>
                  </table>
                  <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f1f5f9; border-radius: 10px;">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Số tiền thanh toán</div>
                    <div style="font-size: 28px; font-weight: 800; color: #059669;">${amount.toLocaleString("vi-VN")} đ</div>
                  </div>
                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                    Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!
                  </p>
                </div>
                <div style="padding: 16px 24px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 Hệ thống Quản lý Thuê Gian hàng Thương mại</p>
                </div>
              </div>
            `
          });
        }
      } catch (mailError) {
        console.warn("Không thể gửi email xác nhận thanh toán:", mailError);
      }

      try {
        const notifContent = `Thanh toán ${paymentCode} - ${amount.toLocaleString("vi-VN")} đ thành công`;
        await prisma.notification.create({
          data: {
            title: "Thanh toán thành công",
            content: notifContent,
            type: "success",
            userId: contract.customer?.userId || null
          }
        });
        getIO().emit("notification", { title: "Thanh toán thành công", content: notifContent, type: "success" });
      } catch (notifError) {
        console.warn("Không thể tạo thông báo:", notifError);
      }
    }

    return payment;
  }

  async update(id: number, dto: any) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new AppError("Giao dịch thanh toán không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const updateData: any = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.amount !== undefined) updateData.amount = parseFloat(dto.amount);
    if (dto.paymentDate !== undefined) updateData.paymentDate = new Date(dto.paymentDate);

    return this.paymentRepository.update(id, updateData);
  }

  async delete(id: number) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new AppError("Giao dịch thanh toán không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    return this.paymentRepository.delete(id);
  }

  async findById(id: number) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new AppError("Giao dịch thanh toán không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }
    return payment;
  }

  async findAll(params: any) {
    return this.paymentRepository.findAll({
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10"),
      search: params.search,
      status: params.status,
      contractId: params.contractId ? parseInt(params.contractId) : undefined,
      paymentMethod: params.paymentMethod
    });
  }

  async createVNPayUrl(dto: any) {
    const { amount, orderInfo } = dto;
    if (!amount || !orderInfo) {
      throw new AppError("Số tiền và thông tin giao dịch là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const baseUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const params = new URLSearchParams({
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: "DEMO2026",
      vnp_Amount: String(amount * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: `VNP-${Date.now()}`,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: "http://localhost:5173/payment-success"
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async createMoMoUrl(dto: any) {
    const { amount, orderInfo } = dto;
    if (!amount || !orderInfo) {
      throw new AppError("Số tiền và thông tin giao dịch là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    return `https://test-payment.momo.vn/v2/gateway/api/create?partnerCode=MOMO&requestId=${Date.now()}&amount=${amount}&orderId=MOMO${Date.now()}&orderInfo=${encodeURIComponent(orderInfo)}&redirectUrl=${encodeURIComponent("http://localhost:5173/payment-success")}&ipnUrl=${encodeURIComponent("http://localhost:5173/payment-success")}`;
  }

  async generateQRCode(dto: any) {
    const { contractId, invoiceId, amount } = dto;
    if (!contractId || !amount) {
      throw new AppError("Mã hợp đồng và số tiền là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const contract = await this.contractRepository.findById(parseInt(contractId));
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const paymentRef = `HD${contract.contractCode.replace(/[^A-Za-z0-9]/g, "")}${Date.now().toString().slice(-6)}`;
    return generateVietQR(amount, paymentRef);
  }
}
