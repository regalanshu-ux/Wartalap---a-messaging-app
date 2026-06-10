import Call from "../models/call.model.js";

export const getCallLogs = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all calls where the user is either the caller or the receiver
    const calls = await Call.find({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ],
    })
      .populate("callerId", "_id fullName username profilePic")
      .populate("receiverId", "_id fullName username profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(calls);
  } catch (error) {
    console.error("Error in getCallLogs controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
