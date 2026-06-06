import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        receiverId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        text:{
            type:String,
            
        },
        image: {
            type:String,
            
        },
    },
    {timestamps: true }
);

// Automatically delete messages after 24 hours (86400 seconds)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Message = mongoose.model("Message", messageSchema);

export default Message;