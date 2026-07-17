import { BoothRepository } from "../repositories/booth.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import cloudinary from "../config/cloudinary";

export class BoothService {
  private boothRepository = new BoothRepository();

  async create(dto: any) {
    if (!dto.name) {
      throw new AppError("Tên gian hàng là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }
    return this.boothRepository.create({
      name: dto.name,
      floor: parseInt(dto.floor),
      zone: dto.zone,
      area: parseFloat(dto.area),
      price: parseFloat(dto.price),
      status: dto.status || "available",
      description: dto.description || "",
      images: dto.images || ""
    });
  }

  async update(id: number, dto: any) {
    const booth = await this.boothRepository.findById(id);
    if (!booth) {
      throw new AppError("Không tìm thấy gian hàng.", HTTP_STATUS.NOT_FOUND);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.floor !== undefined) updateData.floor = parseInt(dto.floor);
    if (dto.zone !== undefined) updateData.zone = dto.zone;
    if (dto.area !== undefined) updateData.area = parseFloat(dto.area);
    if (dto.price !== undefined) updateData.price = parseFloat(dto.price);
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.images !== undefined) updateData.images = dto.images;

    return this.boothRepository.update(id, updateData);
  }

  async delete(id: number) {
    const booth = await this.boothRepository.findById(id);
    if (!booth) {
      throw new AppError("Không tìm thấy gian hàng.", HTTP_STATUS.NOT_FOUND);
    }

    if (booth.status === "rented") {
      throw new AppError("Không thể xóa gian hàng đang được thuê. Vui lòng thanh lý hợp đồng trước.", HTTP_STATUS.BAD_REQUEST);
    }

    return this.boothRepository.delete(id);
  }

  async findById(id: number) {
    const booth = await this.boothRepository.findById(id);
    if (!booth) {
      throw new AppError("Không tìm thấy gian hàng.", HTTP_STATUS.NOT_FOUND);
    }
    return booth;
  }

  async findAll(params: any) {
    return this.boothRepository.findAll({
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10"),
      search: params.search,
      floor: params.floor ? parseInt(params.floor) : undefined,
      zone: params.zone,
      status: params.status,
      minArea: params.minArea ? parseFloat(params.minArea) : undefined,
      maxArea: params.maxArea ? parseFloat(params.maxArea) : undefined,
      minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    });
  }

  async uploadImages(files: Express.Multer.File[]) {
    const urls: string[] = [];

    for (const file of files) {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const res = await cloudinary.uploader.upload(base64File, {
        folder: "booth_rental/booths"
      });
      urls.push(res.secure_url);
    }

    return urls;
  }
}
