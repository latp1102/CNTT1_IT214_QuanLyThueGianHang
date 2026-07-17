import { Router } from "express";
import passport from "passport";
import { AuthController } from "../controllers/auth.controller";
import { FaceController } from "../controllers/face.controller";
import { authenticate } from "../middlewares/auth";
import { asHandler } from "../utils/handler";

const router = Router();
const controller = new AuthController();
const faceController = new FaceController();

router.post("/login", asHandler(controller.login));
router.post("/register", asHandler(controller.register));
router.post("/refresh-token", asHandler(controller.refreshToken));
router.post("/forgot-password", asHandler(controller.forgotPassword));
router.post("/verify-reset-code", asHandler(controller.verifyResetCode));
router.post("/reset-password", asHandler(controller.resetPassword));

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Social Login - Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login?error=auth_failed`, session: false }), asHandler(controller.googleCallback));

// Social Login - Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"], session: false }));
router.get("/facebook/callback", passport.authenticate("facebook", { failureRedirect: `${CLIENT_URL}/login?error=auth_failed`, session: false }), asHandler(controller.facebookCallback));

// Face recognition routes
router.post("/face/save-facial-id", authenticate, asHandler(faceController.saveFaceDescriptor));
router.post("/face/login", asHandler(faceController.login));

// Protected routes
router.post("/change-password", authenticate, asHandler(controller.changePassword));
router.get("/profile", authenticate, asHandler(controller.getProfile));

export default router;
