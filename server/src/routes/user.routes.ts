import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/rbac";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new UserController();

router.get("/", authenticate, authorize(["account:read"]), asHandler(controller.findAll));
router.get("/roles", authenticate, authorize(["account:read"]), asHandler(controller.getRoles));
router.get("/permissions", authenticate, authorize(["account:read"]), asHandler(controller.getPermissions));
router.patch("/:id/status", authenticate, authorize(["account:write"]), asHandler(controller.updateStatus));
router.post("/:id/roles", authenticate, authorize(["account:write"]), asHandler(controller.assignRoles));
router.delete("/:id", authenticate, authorize(["account:write"]), asHandler(controller.delete));

export default router;
