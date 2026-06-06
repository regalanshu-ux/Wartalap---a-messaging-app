import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Search users and return their connection status relative to the logged-in user
export const searchUsers = async (req, res) => {
  const { query } = req.query;
  const loggedInUserId = req.user._id;

  try {
    if (!query || query.trim() === "") {
      return res.status(200).json([]);
    }

    const cleanQuery = query.trim();
    // Escape special characters to prevent regex injection, then anchor with ^ and $ for exact matching
    const escapedQuery = cleanQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapedQuery}$`, "i");

    // Find matching users (excluding logged-in user)
    const matches = await User.find({
      _id: { $ne: loggedInUserId },
      $or: [{ username: exactRegex }, { email: exactRegex }, { fullName: exactRegex }],
    }).select("-password");

    const results = await Promise.all(
      matches.map(async (user) => {
        // Find existing friend request in either direction
        const request = await FriendRequest.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        });

        let relationship = "none";
        if (request) {
          if (request.status === "accepted") {
            relationship = "accepted";
          } else if (request.status === "pending") {
            relationship =
              request.senderId.toString() === loggedInUserId.toString()
                ? "sent"
                : "received";
          }
        }

        return {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePic: user.profilePic,
          relationship,
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("Error in searchUsers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  try {
    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: "You cannot send a request to yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for existing request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({ message: "You are already friends with this user" });
      }
      return res.status(400).json({ message: "A friend request is already pending between you" });
    }

    const newRequest = new FriendRequest({
      senderId,
      receiverId,
      status: "pending",
    });

    await newRequest.save();

    // Notify the receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      const populatedSender = await User.findById(senderId).select("-password");
      io.to(receiverSocketId).emit("friendRequestReceived", {
        _id: newRequest._id,
        senderId: populatedSender,
        receiverId,
        status: "pending",
        createdAt: newRequest.createdAt,
      });
    }

    res.status(201).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error in sendFriendRequest controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  const { senderId } = req.body; // The user who sent the request originally
  const receiverId = req.user._id; // The logged-in user accepting it

  try {
    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is required" });
    }

    const request = await FriendRequest.findOne({
      senderId,
      receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    request.status = "accepted";
    await request.save();

    // Fetch populated info for socket notifications
    const populatedReceiver = await User.findById(receiverId).select("-password");
    const populatedSender = await User.findById(senderId).select("-password");

    // Notify original sender via socket
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        friend: populatedReceiver,
      });
    }

    // Also notify current receiver (for UI update)
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestAccepted", {
        friend: populatedSender,
      });
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error in acceptFriendRequest controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  const { senderId } = req.body; // The user who sent the request originally
  const receiverId = req.user._id; // The logged-in user rejecting it

  try {
    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is required" });
    }

    const request = await FriendRequest.findOneAndDelete({
      senderId,
      receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    // Notify original sender via socket
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestRejected", {
        userId: receiverId,
      });
    }

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error in rejectFriendRequest controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Cancel a sent friend request
export const cancelFriendRequest = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  try {
    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    const request = await FriendRequest.findOneAndDelete({
      senderId,
      receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    // Notify receiver via socket so they can clear it from incoming list
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestCancelled", {
        senderId,
      });
    }

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error in cancelFriendRequest controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get list of incoming & outgoing pending requests
export const getFriendRequests = async (req, res) => {
  const userId = req.user._id;

  try {
    const incoming = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    }).populate("senderId", "_id fullName username email profilePic");

    const outgoing = await FriendRequest.find({
      senderId: userId,
      status: "pending",
    }).populate("receiverId", "_id fullName username email profilePic");

    res.status(200).json({
      incoming,
      outgoing,
    });
  } catch (error) {
    console.error("Error in getFriendRequests controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
