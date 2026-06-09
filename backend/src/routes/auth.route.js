import express from "express";
import { login, logout, signup, updateProfile, checkAuth, verifyOtp, resendOtp, forgotPassword, resetPassword, getTurnCredentials } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);
router.get("/turn-credentials", protectRoute, getTurnCredentials);

router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;