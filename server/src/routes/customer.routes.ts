import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { authenticate } from "../middlewares/auth";
import upload from "../middlewares/upload";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new CustomerController();

router.get("/", authenticate, asHandler(controller.findAll));
router.get("/:id", authenticate, asHandler(controller.findById));
router.get("/:id/images", authenticate, asHandler(controller.findWithImages));
router.post("/", authenticate, asHandler(controller.create));
router.put("/:id", authenticate, asHandler(controller.update));
router.delete("/:id", authenticate, asHandler(controller.delete));
router.post("/upload", authenticate, upload.single("avatar"), asHandler(controller.uploadAvatar));
router.post("/upload-images", authenticate, upload.array("images", 10), asHandler(controller.uploadImages));
router.delete("/images/:imageId", authenticate, asHandler(controller.deleteImage));

export default router;
