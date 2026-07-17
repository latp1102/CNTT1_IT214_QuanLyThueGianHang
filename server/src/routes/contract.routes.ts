import { Router } from "express";
import { ContractController } from "../controllers/contract.controller";
import { authenticate } from "../middlewares/auth";
import upload from "../middlewares/upload";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new ContractController();

router.get("/", authenticate, asHandler(controller.findAll));
router.get("/:id", authenticate, asHandler(controller.findById));
router.post("/", authenticate, asHandler(controller.create));
router.put("/:id", authenticate, asHandler(controller.update));
router.post("/:id/extend", authenticate, asHandler(controller.extend));
router.post("/:id/terminate", authenticate, asHandler(controller.terminate));
router.delete("/:id", authenticate, asHandler(controller.delete));
router.post("/upload", authenticate, upload.single("pdf"), asHandler(controller.uploadPdf));

// Smart Contract: PDF generation & QR verification
router.get("/:id/pdf", authenticate, asHandler(controller.downloadPdf));
router.get("/verify/:code", asHandler(controller.verifyContract));

export default router;
