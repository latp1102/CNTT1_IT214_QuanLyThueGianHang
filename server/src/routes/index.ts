import { Router } from "express";
import authRoutes from "./auth.routes";
import boothRoutes from "./booth.routes";
import customerRoutes from "./customer.routes";
import contractRoutes from "./contract.routes";
import invoiceRoutes from "./invoice.routes";
import paymentRoutes from "./payment.routes";
import reportRoutes from "./report.routes";
import userRoutes from "./user.routes";
import chatRoutes from "./chat.routes";
import videoCallRoutes from "./video-call.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/booths", boothRoutes);
router.use("/customers", customerRoutes);
router.use("/contracts", contractRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/payments", paymentRoutes);
router.use("/reports", reportRoutes);

// Root API route returning a simple status message
router.get('/', (req, res) => {
  res.json({ message: 'API root', status: 'ok' });
});
router.use("/users", userRoutes);
router.use("/chat", chatRoutes);
router.use("/video-calls", videoCallRoutes);

export default router;
