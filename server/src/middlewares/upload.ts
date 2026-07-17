import multer from "multer";
import { Request } from "express";
import { AppError } from "./error";
import { HTTP_STATUS } from "../constants";

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Định dạng tập tin không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, PDF và Excel", HTTP_STATUS.BAD_REQUEST));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limits
  },
  fileFilter
});

export default upload;
