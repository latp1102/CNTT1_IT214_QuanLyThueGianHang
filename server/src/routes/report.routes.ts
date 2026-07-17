import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/rbac";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new ReportController();

router.get("/dashboard-stats", authenticate, asHandler(controller.getDashboardStats));
router.get("/revenue", authenticate, authorize(["report:read"]), asHandler(controller.getRevenueReport));
router.get("/top-customers", authenticate, authorize(["report:read"]), asHandler(controller.getTopCustomers));
router.get("/top-booths", authenticate, authorize(["report:read"]), asHandler(controller.getTopBooths));

export default router;
