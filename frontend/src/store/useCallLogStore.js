import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useCallLogStore = create((set) => ({
  callLogs: [],
  isLogsLoading: false,

  getCallLogs: async () => {
    set({ isLogsLoading: true });
    try {
      const res = await axiosInstance.get("/calls");
      set({ callLogs: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load call history");
    } finally {
      set({ isLogsLoading: false });
    }
  },
}));
