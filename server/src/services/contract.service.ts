import { ContractRepository } from "../repositories/contract.repository";
import { BoothRepository } from "../repositories/booth.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { InvoiceRepository } from "../repositories/invoice.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import cloudinary from "../config/cloudinary";
import { generateVietQR } from "../utils/vietqr";

export class ContractService {
  private contractRepository = new ContractRepository();
  private boothRepository = new BoothRepository();
  private customerRepository = new CustomerRepository();
  private invoiceRepository = new InvoiceRepository();

  async create(dto: any) {
    const { boothId, customerId, deposit, startDate, endDate } = dto;

    if (!boothId || !customerId || deposit === undefined || !startDate || !endDate) {
      throw new AppError("Mã gian hàng, mã khách thuê, tiền cọc, ngày bắt đầu và ngày kết thúc là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const booth = await this.boothRepository.findById(parseInt(boothId));
    if (!booth) {
      throw new AppError("Gian hàng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    if (booth.status !== "available") {
      throw new AppError("Gian hàng hiện không sẵn sàng để thuê.", HTTP_STATUS.BAD_REQUEST);
    }

    const customer = await this.customerRepository.findById(parseInt(customerId));
    if (!customer) {
      throw new AppError("Khách thuê không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new AppError("Ngày kết thúc phải sau ngày bắt đầu thuê.", HTTP_STATUS.BAD_REQUEST);
    }

    const year = start.getFullYear();
    const cleanBoothName = booth.name.replace(/\s+/g, "-").toUpperCase();
    const contractCode = `HD-${year}-${cleanBoothName}-${Date.now().toString().slice(-4)}`;

    const contract = await this.contractRepository.create({
      contractCode,
      boothId: parseInt(boothId),
      customerId: parseInt(customerId),
      deposit: parseFloat(deposit),
      startDate: start,
      endDate: end,
      status: "active",
      pdfUrl: dto.pdfUrl || null
    });

    let qrInfo = null;
    try {
      const invoiceCode = `INV-DEP-${contractCode}`;
      await this.invoiceRepository.create({
        invoiceCode,
        contractId: contract.id,
        title: `Hóa đơn đặt cọc hợp đồng ${contractCode}`,
        description: `Tiền cọc thuê mặt bằng cho gian hàng ${booth.name}`,
        amount: parseFloat(deposit),
        dueDate: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: "unpaid"
      });

      qrInfo = await generateVietQR(parseFloat(deposit), contractCode);
    } catch (err) {
      console.error("Lỗi khi tạo hóa đơn / QR:", err);
    }

    return { ...contract, paymentQR: qrInfo };
  }

  async update(id: number, dto: any) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const updateData: any = {};
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.deposit !== undefined) updateData.deposit = parseFloat(dto.deposit);
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.pdfUrl !== undefined) updateData.pdfUrl = dto.pdfUrl;

    return this.contractRepository.update(id, updateData);
  }

  async extend(id: number, dto: any) {
    const { newEndDate } = dto;
    if (!newEndDate) {
      throw new AppError("Ngày kết thúc gia hạn mới là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    if (contract.status !== "active") {
      throw new AppError("Chỉ có thể gia hạn hợp đồng đang hoạt động.", HTTP_STATUS.BAD_REQUEST);
    }

    const end = new Date(newEndDate);
    if (end <= new Date(contract.endDate)) {
      throw new AppError("Ngày kết thúc gia hạn phải sau ngày kết thúc hiện tại.", HTTP_STATUS.BAD_REQUEST);
    }

    return this.contractRepository.update(id, {
      endDate: end
    });
  }

  async terminate(id: number) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    if (contract.status === "terminated") {
      throw new AppError("Hợp đồng đã được thanh lý trước đó.", HTTP_STATUS.BAD_REQUEST);
    }

    return this.contractRepository.terminate(id, contract.boothId);
  }

  async delete(id: number) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    return this.contractRepository.delete(id, contract.boothId);
  }

  async findById(id: number) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError("Hợp đồng không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }
    return contract;
  }

  async findAll(params: any) {
    return this.contractRepository.findAll({
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10"),
      search: params.search,
      status: params.status,
      customerId: params.customerId ? parseInt(params.customerId) : undefined,
      boothId: params.boothId ? parseInt(params.boothId) : undefined
    });
  }

  async uploadPdf(file: Express.Multer.File) {
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME
      && process.env.CLOUDINARY_CLOUD_NAME !== "cloudinary_cloud_name";

    if (isCloudinaryConfigured) {
      try {
        const base64File = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const res = await cloudinary.uploader.upload(base64File, {
          folder: "booth_rental/contracts",
          resource_type: "raw"
        });
        return res.secure_url;
      } catch {
        // fallback to dummy PDF below
      }
    }
    return "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  }
}
