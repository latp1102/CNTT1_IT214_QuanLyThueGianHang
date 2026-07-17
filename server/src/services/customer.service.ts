import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerImageRepository } from "../repositories/customer-image.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";
import cloudinary from "../config/cloudinary";

export class CustomerService {
  private customerRepository = new CustomerRepository();
  private customerImageRepository = new CustomerImageRepository();
  private userRepository = new UserRepository();

  async create(dto: any) {
    if (!dto.name || !dto.email || !dto.phone || !dto.idCard) {
      throw new AppError("Họ tên, email, số điện thoại và CCCD là bắt buộc.", HTTP_STATUS.BAD_REQUEST);
    }

    const existingEmail = await this.customerRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new AppError("Email khách thuê đã tồn tại trong hệ thống.", HTTP_STATUS.CONFLICT);
    }

    if (dto.userId) {
      const user = await this.userRepository.findById(parseInt(dto.userId));
      if (!user) {
        throw new AppError("Tài khoản liên kết không tồn tại.", HTTP_STATUS.BAD_REQUEST);
      }
    }

    return this.customerRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      idCard: dto.idCard,
      company: dto.company || "",
      address: dto.address || "",
      avatar: dto.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${dto.name}`,
      status: dto.status || "active",
      userId: dto.userId ? parseInt(dto.userId) : null
    });
  }

  async update(id: number, dto: any) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError("Không tìm thấy thông tin khách thuê.", HTTP_STATUS.NOT_FOUND);
    }

    if (dto.email && dto.email !== customer.email) {
      const existingEmail = await this.customerRepository.findByEmail(dto.email);
      if (existingEmail) {
        throw new AppError("Email khách thuê đã tồn tại trong hệ thống.", HTTP_STATUS.CONFLICT);
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.idCard !== undefined) updateData.idCard = dto.idCard;
    if (dto.company !== undefined) updateData.company = dto.company;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.userId !== undefined) updateData.userId = dto.userId ? parseInt(dto.userId) : null;

    return this.customerRepository.update(id, updateData);
  }

  async delete(id: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError("Không tìm thấy khách thuê.", HTTP_STATUS.NOT_FOUND);
    }

    const hasActiveContracts = customer.contracts.some((c: any) => c.status === "active");
    if (hasActiveContracts) {
      throw new AppError("Không thể xóa khách thuê đang có hợp đồng hoạt động.", HTTP_STATUS.BAD_REQUEST);
    }

    return this.customerRepository.delete(id);
  }

  async findById(id: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError("Không tìm thấy khách thuê.", HTTP_STATUS.NOT_FOUND);
    }
    return customer;
  }

  async findAll(params: any) {
    return this.customerRepository.findAll({
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10"),
      search: params.search,
      status: params.status
    });
  }

  async uploadAvatar(file: Express.Multer.File) {
    const base64File = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const res = await cloudinary.uploader.upload(base64File, {
      folder: "booth_rental/avatars"
    });
    return res.secure_url;
  }

  async uploadImages(files: Express.Multer.File[], customerId: number) {
    const urls: string[] = [];

    for (const file of files) {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const res = await cloudinary.uploader.upload(base64File, {
        folder: "booth_rental/customers"
      });
      urls.push(res.secure_url);
    }

    await this.customerImageRepository.createMany(
      urls.map(url => ({ customerId, imageUrl: url, caption: "" }))
    );

    return urls;
  }

  async findWithImages(id: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError("Không tìm thấy khách thuê.", HTTP_STATUS.NOT_FOUND);
    }
    const images = await this.customerImageRepository.findByCustomerId(id);
    return { ...customer, images };
  }

  async deleteImage(imageId: number) {
    await this.customerImageRepository.delete(imageId);
  }
}
