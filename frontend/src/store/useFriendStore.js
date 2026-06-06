import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";
import { useChatStore } from "./useChatStore.js";

export const useFriendStore = create((set, get) => ({
  searchResults: [],
  pendingRequests: { incoming: [], outgoing: [] },
  isSearching: false,
  isRequestsLoading: false,

  searchUsers: async (query) => {
    if (!query || query.trim() === "") {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/friends/search?query=${encodeURIComponent(query)}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error searching users");
    } finally {
      set({ isSearching: false });
    }
  },

  getRequests: async () => {
    set({ isRequestsLoading: true });
    try {
      const res = await axiosInstance.get("/friends/requests");
      set({ pendingRequests: res.data });
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      set({ isRequestsLoading: false });
    }
  },

  sendRequest: async (receiverId) => {
    try {
      await axiosInstance.post("/friends/request", { receiverId });
      toast.success("Connection request sent!");
      
      // Update relationship status in search results locally
      set({
        searchResults: get().searchResults.map((user) =>
          user._id === receiverId ? { ...user, relationship: "sent" } : user
        ),
      });
      get().getRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  },

  acceptRequest: async (senderId) => {
    try {
      await axiosInstance.post("/friends/accept", { senderId });
      toast.success("Connection request accepted!");
      
      // Update search results locally if user is in them
      set({
        searchResults: get().searchResults.map((user) =>
          user._id === senderId ? { ...user, relationship: "accepted" } : user
        ),
      });

      // Refresh requests and contact lists
      await get().getRequests();
      await useChatStore.getState().getUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    }
  },

  rejectRequest: async (senderId) => {
    try {
      await axiosInstance.post("/friends/reject", { senderId });
      toast.success("Request declined");
      
      set({
        searchResults: get().searchResults.map((user) =>
          user._id === senderId ? { ...user, relationship: "none" } : user
        ),
      });
      get().getRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  },

  cancelRequest: async (receiverId) => {
    try {
      await axiosInstance.post("/friends/cancel", { receiverId });
      toast.success("Request cancelled");
      
      set({
        searchResults: get().searchResults.map((user) =>
          user._id === receiverId ? { ...user, relationship: "none" } : user
        ),
      });
      get().getRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel request");
    }
  },

  subscribeToFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove duplicates first
    socket.off("friendRequestReceived");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("friendRequestCancelled");

    // Receive incoming request
    socket.on("friendRequestReceived", (request) => {
      const currentRequests = get().pendingRequests;
      set({
        pendingRequests: {
          ...currentRequests,
          incoming: [...currentRequests.incoming, request],
        },
      });
      toast.success(`${request.senderId.fullName} sent you a connection request!`);
    });

    // Request was accepted
    socket.on("friendRequestAccepted", ({ friend }) => {
      toast.success(`You are now connected with ${friend.fullName}!`);
      
      // Refresh pending requests and chats list
      get().getRequests();
      useChatStore.getState().getUsers();
    });

    // Request was rejected/declined
    socket.on("friendRequestRejected", ({ userId }) => {
      get().getRequests();
    });

    // Request was cancelled by sender
    socket.on("friendRequestCancelled", ({ senderId }) => {
      get().getRequests();
    });
  },

  unsubscribeFromFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("friendRequestReceived");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("friendRequestCancelled");
  },
}));
