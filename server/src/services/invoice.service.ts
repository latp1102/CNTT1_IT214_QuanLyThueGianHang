import { InvoiceRepository } from "../repositories/invoice.repository";
import { ContractRepository } from "../repositories/contract.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";

export class InvoiceService {
  private invoiceRepository = new InvoiceRepository();
  private contractRepository = new ContractRepository();

  async create(dto: any) {
    const { contractId, title, amount, dueDate, description } = dto;

    if (!contractId || !title || amount === undefined || !dueDate) {
      throw new AppError("Mã hợp đồng, tiêu đề, số tiền và hạn thanh toán là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const contract = await this.contractRepository.findById(parseInt(contractId));
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const due = new Date(dueDate);
    const year = due.getFullYear();
    const month = String(due.getMonth() + 1).padStart(2, "0");
    const cleanBoothName = contract.booth.name.replace(/\s+/g, "-").toUpperCase();
    const invoiceCode = `INV-${year}-${month}-${cleanBoothName}-${Date.now().toString().slice(-4)}`;

    return this.invoiceRepository.create({
      invoiceCode,
      contractId: parseInt(contractId),
      title,
      description: description || "",
      amount: parseFloat(amount),
      dueDate: due,
      status: dto.status || "unpaid"
    });
  }

  async update(id: number, dto: any) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Hóa đơn không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.amount !== undefined) updateData.amount = parseFloat(dto.amount);
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.pdfUrl !== undefined) updateData.pdfUrl = dto.pdfUrl;
    if (dto.excelUrl !== undefined) updateData.excelUrl = dto.excelUrl;

    return this.invoiceRepository.update(id, updateData);
  }

  async delete(id: number) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Hóa đơn không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    if (invoice.status === "paid") {
      throw new AppError("Không thể xóa hóa đơn đã được thanh toán.", HTTP_STATUS.BAD_REQUEST);
    }

    return this.invoiceRepository.delete(id);
  }

  async findById(id: number) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Hóa đơn không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }
    return invoice;
  }

  async findAll(params: any) {
    return this.invoiceRepository.findAll({
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10"),
      search: params.search,
      status: params.status,
      contractId: params.contractId ? parseInt(params.contractId) : undefined
    });
  }

  async exportExcel(id: number) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Hóa đơn không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const rows = [
      ["HOA DON THANH TOAN GIAN HANG"],
      ["Ma hoa don", invoice.invoiceCode],
      ["Tieu de", invoice.title],
      ["Khach thue", invoice.contract.customer.name],
      ["So dien thoai", invoice.contract.customer.phone],
      ["Gian hang", invoice.contract.booth.name],
      ["Tang", invoice.contract.booth.floor],
      ["Khu vuc", invoice.contract.booth.zone],
      ["So tien", invoice.amount.toString() + " VND"],
      ["Han thanh toan", new Date(invoice.dueDate).toLocaleDateString("vi-VN")],
      ["Trang thai", invoice.status === "paid" ? "Da thanh toan" : "Chua thanh toan"],
      ["Ngay xuat phieu", new Date().toLocaleDateString("vi-VN")]
    ];

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    return {
      fileName: `Hoa_Don_${invoice.invoiceCode}.csv`,
      content: csvContent
    };
  }

  async exportPdf(id: number) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Hóa đơn không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const html = `
      <html>
        <head>
          <title>Hóa đơn ${invoice.invoiceCode}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
            .meta { font-size: 14px; color: #666; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Hóa đơn thanh toán</div>
            <div class="meta">Mã hóa đơn: ${invoice.invoiceCode} | Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}</div>
          </div>
          <div class="section">
            <div class="section-title">Thông tin khách hàng</div>
            <p><strong>Khách thuê:</strong> ${invoice.contract.customer.name}</p>
            <p><strong>Số điện thoại:</strong> ${invoice.contract.customer.phone} | <strong>Email:</strong> ${invoice.contract.customer.email}</p>
            <p><strong>Doanh nghiệp:</strong> ${invoice.contract.customer.company || "Cá nhân"}</p>
          </div>
          <div class="section">
            <div class="section-title">Thông tin gian hàng</div>
            <p><strong>Gian hàng:</strong> ${invoice.contract.booth.name}</p>
            <p><strong>Vị trí:</strong> Tầng ${invoice.contract.booth.floor}, Khu ${invoice.contract.booth.zone}</p>
            <p><strong>Diện tích:</strong> ${invoice.contract.booth.area} m²</p>
          </div>
          <div class="section">
            <div class="section-title">Chi tiết hóa đơn</div>
            <table>
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Hạn thanh toán</th>
                  <th>Trạng thái</th>
                  <th style="text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${invoice.title}<br/><small>${invoice.description || ""}</small></td>
                  <td>${new Date(invoice.dueDate).toLocaleDateString("vi-VN")}</td>
                  <td>${invoice.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</td>
                  <td style="text-align: right;">${invoice.amount.toLocaleString("vi-VN")} đ</td>
                </tr>
              </tbody>
            </table>
            <div class="total">Tổng tiền thanh toán: ${invoice.amount.toLocaleString("vi-VN")} đ</div>
          </div>
          <div class="footer">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
            <p>Hệ thống Quản lý thuê gian hàng thương mại</p>
          </div>
        </body>
      </html>
    `;
    return html;
  }
}
