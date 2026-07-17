import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();
const chatController = new ChatController();

router.post("/message", authenticate, chatController.sendMessage);

export default router;
