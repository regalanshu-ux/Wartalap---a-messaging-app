import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCallLogs } from "../controllers/call.controller.js";

const router = express.Router();

router.get("/", protectRoute, getCallLogs);

export default router;
