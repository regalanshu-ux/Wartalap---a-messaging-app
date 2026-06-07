import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadMessages: {}, // key: senderId, value: message list

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/message/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/message/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  addUnreadMessage: (message) => {
    const { unreadMessages } = get();
    const senderId = message.senderId;
    const currentList = unreadMessages[senderId] || [];
    set({
      unreadMessages: {
        ...unreadMessages,
        [senderId]: [...currentList, message],
      },
    });
  },

  clearUnreadMessages: (userId) => {
    const { unreadMessages } = get();
    if (!unreadMessages[userId]) return;
    const newUnread = { ...unreadMessages };
    delete newUnread[userId];
    set({ unreadMessages: newUnread });
  },

  initMessageListener: (socket) => {
    if (!socket) return;
    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      if (selectedUser && selectedUser._id === newMessage.senderId && !document.hidden) {
        set({
          messages: [...get().messages, newMessage],
        });
      } else {
        get().addUnreadMessage(newMessage);
      }
    });
  },

  subscribeToMessages: () => {
    // Handled globally via initMessageListener
  },

  unsubscribeFromMessages: () => {
    // Handled globally
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) {
      get().clearUnreadMessages(selectedUser._id);
    }
  },
}));
