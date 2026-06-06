import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email:{
            type:String,
            required:true,
            unique:true,
        },
        username:{
            type:String,
            required:true,
            unique:true,
            trim:true,
            lowercase:true,
            minlength:3,
        },
        fullName:{
            type: String,
            required:true,
        },
        password:{
            type:String,
            required:true,
            minlength: 6,
        },
        profilePic: {
            type:String,
            default: "",
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationOtp: {
            type: String,
        },
        verificationOtpExpires: {
            type: Date,
        },
        resetPasswordOtp: {
            type: String,
        },
        resetPasswordOtpExpires: {
            type: Date,
        },
    },
    {timestamps: true } 
);

const User = mongoose.model("User", userSchema);

export default User;