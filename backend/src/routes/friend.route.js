import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchUsers);
router.get("/requests", protectRoute, getFriendRequests);

router.post("/request", protectRoute, sendFriendRequest);
router.post("/accept", protectRoute, acceptFriendRequest);
router.post("/reject", protectRoute, rejectFriendRequest);
router.post("/cancel", protectRoute, cancelFriendRequest);

export default router;
