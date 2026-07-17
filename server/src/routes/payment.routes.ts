import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new PaymentController();

router.get("/", authenticate, asHandler(controller.findAll));
router.get("/:id", authenticate, asHandler(controller.findById));
router.post("/", authenticate, asHandler(controller.create));
router.put("/:id", authenticate, asHandler(controller.update));
router.delete("/:id", authenticate, asHandler(controller.delete));

// Online payments urls generators
router.post("/vnpay-url", authenticate, asHandler(controller.createVNPayUrl));
router.post("/momo-url", authenticate, asHandler(controller.createMoMoUrl));

// QR Code payment
router.post("/qr-code", authenticate, asHandler(controller.generateQRCode));

export default router;
