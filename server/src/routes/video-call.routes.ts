import { Router } from "express";
import { VideoCallController } from "../controllers/video-call.controller";
import { authenticate } from "../middlewares/auth";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new VideoCallController();

router.post("/", authenticate, asHandler(controller.create));
router.get("/history", authenticate, asHandler(controller.getHistory));
router.patch("/:id/start", authenticate, asHandler(controller.startCall));
router.patch("/:id/end", authenticate, asHandler(controller.endCall));
router.patch("/:id/reject", authenticate, asHandler(controller.rejectCall));

export default router;
