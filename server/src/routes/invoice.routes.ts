import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { authenticate } from "../middlewares/auth";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new InvoiceController();

router.get("/", authenticate, asHandler(controller.findAll));
router.get("/:id", authenticate, asHandler(controller.findById));
router.post("/", authenticate, asHandler(controller.create));
router.put("/:id", authenticate, asHandler(controller.update));
router.delete("/:id", authenticate, asHandler(controller.delete));

// Export actions
router.get("/:id/pdf", authenticate, asHandler(controller.exportPdf));
router.get("/:id/excel", authenticate, asHandler(controller.exportExcel));

export default router;
