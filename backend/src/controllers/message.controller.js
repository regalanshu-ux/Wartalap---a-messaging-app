import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import cloudinary from "../lib/cloudnary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUserForSidebar = async(req,res) => {
    try{
        const loggedInUserId = req.user._id;

        // Find all accepted friend requests for loggedInUserId
        const acceptedRequests = await FriendRequest.find({
            status: "accepted",
            $or: [
                { senderId: loggedInUserId },
                { receiverId: loggedInUserId }
            ]
        });

        // Extract the friend's user ID from each accepted request
        const friendIds = acceptedRequests.map(req => 
            req.senderId.toString() === loggedInUserId.toString() ? req.receiverId : req.senderId
        );

        const filteredUsers = await User.find({ _id: { $in: friendIds } }).select("-password");
        res.status(200).json(filteredUsers);
    }catch(error){
            console.error("Error in getUserForSidebar:", error);
            res.status(500).json({error:"Internal server error"});
    }
};

export const getMessages= async(req,res)=>{
    try{
        const {id:userToChatId}=req.params
        const senderId= req.user._id;
        const messages= await Message.find({
            $or:[
                {senderId:senderId,receiverId:userToChatId},
                {senderId:userToChatId,receiverId:senderId}
            ]
        })

        res.status(200).json(messages)
    }catch(error){
        console.log("error in getMessages controller:",error.message);
        res.status(500).json({message:"Internal server error"});
    }
};

export const sendMessage= async (req,res)=> {
    try {
        const { text, image}= req.body;
        const { id: receiverId}= req.params;
        const senderId= req.user._id;

        let imageUrl;
        if(image){
            //upload base64 image to cloudinary
            const uploadResponse= await cloudinary.uploader.upload(image);
            imageUrl= uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage)
    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({error:"Internal server error"});
    }
};