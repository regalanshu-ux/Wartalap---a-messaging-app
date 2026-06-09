import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const getBackendBaseUrl = () => {
  if (typeof window !== "undefined" && window.Capacitor) {
    if (import.meta.env.MODE === "production") {
      return "https://wartalap.onrender.com";
    }
    return "http://192.168.1.40:5001";
  }
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (import.meta.env.MODE === "development" || hostname === "localhost" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:5001`;
    }
  }
  return "/";
};

const BASE_URL = getBackendBaseUrl();

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  signupEmail: localStorage.getItem("signup-email") || null,
  isRequestingReset: false,
  isResettingPassword: false,

  setSignupEmail: (email) => {
    if (email) {
      localStorage.setItem("signup-email", email);
    } else {
      localStorage.removeItem("signup-email");
    }
    set({ signupEmail: email });
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      get().setSignupEmail(res.data.email);
      toast.success("Verification code sent to your email");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      get().setSignupEmail(null);
      toast.success("Logged in successfully");
      get().connectSocket();
      return true;
    } catch (error) {
      if (error.response?.status === 403) {
        get().setSignupEmail(error.response.data.email);
        toast.error("Please verify your email first");
        return "verify";
      }
      toast.error(error.response?.data?.message || "Invalid credentials");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  verifyOtp: async (otp) => {
    const email = get().signupEmail;
    if (!email) {
      toast.error("No email associated with registration");
      return false;
    }
    try {
      const res = await axiosInstance.post("/auth/verify-otp", { email, otp });
      set({ authUser: res.data });
      get().setSignupEmail(null);
      toast.success("Email verified successfully!");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
      return false;
    }
  },

  resendOtp: async () => {
    const email = get().signupEmail;
    if (!email) {
      toast.error("No email associated with registration");
      return false;
    }
    try {
      await axiosInstance.post("/auth/resend-otp", { email });
      toast.success("Verification code resent");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend code");
      return false;
    }
  },

  forgotPassword: async (email) => {
    set({ isRequestingReset: true });
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Reset code sent to your email!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset code");
      return false;
    } finally {
      set({ isRequestingReset: false });
    }
  },

  resetPassword: async (email, otp, newPassword) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/reset-password", { email, otp, newPassword });
      toast.success(res.data.message || "Password reset successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      return false;
    } finally {
      set({ isResettingPassword: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      get().setSignupEmail(null);
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to logout");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile picture updated");
    } catch (error) {
      console.log("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || (socket && socket.connected)) return;

    const newSocket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    newSocket.connect();
    set({ socket: newSocket });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.disconnect();
    }
    set({ socket: null });
  },
}));
