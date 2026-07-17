import { Router } from "express";
import { BoothController } from "../controllers/booth.controller";
import { authenticate } from "../middlewares/auth";
import upload from "../middlewares/upload";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new BoothController();

router.get("/", authenticate, asHandler(controller.findAll));
router.get("/public", asHandler(controller.listAll));
router.get("/:id", authenticate, asHandler(controller.findById));
router.post("/", authenticate, asHandler(controller.create));
router.put("/:id", authenticate, asHandler(controller.update));
router.delete("/:id", authenticate, asHandler(controller.delete));
router.post("/upload", authenticate, upload.array("images", 5), asHandler(controller.uploadImages));

export default router;
