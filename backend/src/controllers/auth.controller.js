import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudnary.js";
import { sendOtpEmail, sendResetPasswordOtpEmail } from "../lib/email.js";

export const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "All Fields are required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ username: normalizedUsername }),
      User.findOne({ email })
    ]);

    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken, try another username" });
    }

    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const newUser = new User({
      fullName,
      username: normalizedUsername,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: otpExpires,
    });

    if (newUser) {
      // Send OTP first to ensure email sending works before saving/completing signup
      try {
        await sendOtpEmail(email, otp);
        await newUser.save();
        res.status(201).json({
          message: "Verification code sent to your email. Please verify to complete signup.",
          email: newUser.email,
          isVerified: false,
        });
      } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send OTP to ${email}:`, err);
        await newUser.save();
        res.status(201).json({
          message: `Verification code: ${otp} (Email delivery failed: ${err.message})`,
          email: newUser.email,
          isVerified: false,
        });
      }
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // Block unverified accounts
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        email: user.email,
        isVerified: false,
      });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (user.verificationOtp !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (user.verificationOtpExpires < new Date()) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    await user.save();

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in verifyOtp controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP first to ensure it succeeds before saving changes
    try {
      await sendOtpEmail(email, otp);
      user.verificationOtp = otp;
      user.verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();
      res.status(200).json({ message: "Verification code resent successfully" });
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to resend OTP to ${email}:`, err);
      user.verificationOtp = otp;
      user.verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();
      res.status(200).json({
        message: `Verification code: ${otp} (Email delivery failed: ${err.message})`
      });
    }
  } catch (error) {
    console.log("Error in resendOtp controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send reset OTP first to ensure it succeeds before saving changes
    try {
      await sendResetPasswordOtpEmail(email, otp);
      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();
      res.status(200).json({ message: "Password reset code sent to your email." });
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send password reset OTP to ${email}:`, err);
      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();
      res.status(200).json({
        message: `Password reset code: ${otp} (Email delivery failed: ${err.message})`
      });
    }
  } catch (error) {
    console.error("Error in forgotPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    if (user.resetPasswordOtpExpires < new Date()) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    console.error("Error in resetPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};