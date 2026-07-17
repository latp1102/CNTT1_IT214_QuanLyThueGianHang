import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import type { ContractRepository } from "../repositories/contract.repository";

export class PdfService {
  async generateContractPdf(contract: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const { contractCode, booth, customer, deposit, startDate, endDate, status } = contract;
        const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-contract/${contractCode}`;
        const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 150, margin: 2 });

        this.drawHeader(doc, contractCode);
        this.drawCustomerInfo(doc, customer);
        this.drawBoothInfo(doc, booth);
        this.drawContractTerms(doc, deposit, startDate, endDate, status);
        this.drawFooter(doc);
        doc.image(qrBuffer, doc.page.width - 200, doc.page.height - 200, { width: 120 });
        doc.fontSize(8).fillColor("#666").text("Quét mã để xác thực hợp đồng", doc.page.width - 195, doc.page.height - 75, { width: 120, align: "center" });
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private drawHeader(doc: typeof PDFDocument.prototype, contractCode: string) {
    doc.rect(50, 40, 495, 80).fill("#1e1b4b");
    doc.fillColor("#fff").fontSize(22).font("Helvetica-Bold").text("HỢP ĐỒNG THUÊ GIAN HÀNG", 60, 55, { align: "center", width: 475 });
    doc.fontSize(11).font("Helvetica").text(`Mã hợp đồng: ${contractCode}`, 60, 85, { align: "center", width: 475 });
    doc.fillColor("#333");
    doc.moveDown(4);
  }

  private drawCustomerInfo(doc: typeof PDFDocument.prototype, customer: any) {
    const yStart = doc.y + 10;
    doc.rect(50, yStart - 10, 495, 90).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#1e1b4b").fontSize(13).font("Helvetica-Bold").text("THÔNG TIN KHÁCH THUÊ", 65, yStart + 2);
    doc.fillColor("#333").fontSize(10).font("Helvetica");
    doc.text(`Họ tên: ${customer.name}`, 65, yStart + 24);
    doc.text(`Email: ${customer.email}`, 65, yStart + 42);
    doc.text(`Số điện thoại: ${customer.phone}`, 300, yStart + 24);
    doc.text(`CCCD: ${customer.idCard}`, 300, yStart + 42);
    if (customer.company) doc.text(`Doanh nghiệp: ${customer.company}`, 65, yStart + 60);
    if (customer.address) doc.text(`Địa chỉ: ${customer.address}`, 65, yStart + 60);
    doc.moveDown(3);
  }

  private drawBoothInfo(doc: typeof PDFDocument.prototype, booth: any) {
    const yStart = doc.y + 10;
    doc.rect(50, yStart - 10, 495, 90).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#1e1b4b").fontSize(13).font("Helvetica-Bold").text("THÔNG TIN GIAN HÀNG", 65, yStart + 2);
    doc.fillColor("#333").fontSize(10).font("Helvetica");
    doc.text(`Tên gian hàng: ${booth.name}`, 65, yStart + 24);
    doc.text(`Diện tích: ${booth.area} m²`, 65, yStart + 42);
    doc.text(`Giá thuê: ${booth.price.toLocaleString("vi-VN")} đ/tháng`, 65, yStart + 60);
    doc.text(`Vị trí: Tầng ${booth.floor}, Khu ${booth.zone}`, 300, yStart + 24);
    doc.moveDown(3);
  }

  private drawContractTerms(doc: typeof PDFDocument.prototype, deposit: number, startDate: string, endDate: string, status: string) {
    const yStart = doc.y + 10;
    doc.rect(50, yStart - 10, 495, 130).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#1e1b4b").fontSize(13).font("Helvetica-Bold").text("ĐIỀU KHOẢN HỢP ĐỒNG", 65, yStart + 2);
    doc.fillColor("#333").fontSize(10).font("Helvetica");
    doc.text(`Ngày bắt đầu: ${new Date(startDate).toLocaleDateString("vi-VN")}`, 65, yStart + 24);
    doc.text(`Ngày kết thúc: ${new Date(endDate).toLocaleDateString("vi-VN")}`, 65, yStart + 42);
    doc.text(`Tiền đặt cọc: ${deposit.toLocaleString("vi-VN")} đ`, 65, yStart + 60);
    doc.text(`Trạng thái: ${status === "active" ? "Đang hoạt động" : status === "terminated" ? "Đã thanh lý" : "Hết hạn"}`, 65, yStart + 78);

    doc.fontSize(9).fillColor("#666").text(
      "Điều khoản chung:\n1. Bên A (Chủ sở hữu) cho Bên B (Khách thuê) thuê mặt bàng theo thông tin trên.\n2. Bên B có trách nhiệm thanh toán đầy đủ tiền thuê theo hóa đơn hàng tháng.\n3. Hợp đồng có hiệu lực kể từ ngày ký và kết thúc theo thời hạn đã thỏa thuận.",
      65, yStart + 100, { width: 460 }
    );
    doc.moveDown(3);
  }

  private drawFooter(doc: typeof PDFDocument.prototype) {
    const yPos = doc.page.height - 120;
    doc.fontSize(9).fillColor("#94a3b8");
    doc.text(`Ngày phát hành: ${new Date().toLocaleDateString("vi-VN")}`, 50, yPos, { align: "center", width: 495 });
    doc.text("Hệ thống Quản lý Thuê Gian hàng Thương mại", 50, yPos + 14, { align: "center", width: 495 });
  }
}
