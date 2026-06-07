import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import CallModal from "./components/CallModal";

import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import { useChatStore } from "./store/useChatStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const showDesktopNotification = (title, body, sender) => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: body,
      icon: "/logo.jpg",
    });

    notification.onclick = () => {
      window.focus();
      if (sender) {
        useChatStore.getState().setSelectedUser(sender);
      }
      notification.close();
    };

    // Auto-close notification after 3 seconds (smooth dismissal)
    setTimeout(() => {
      notification.close();
    }, 3000);
  }
};

const App = () => {
  const { authUser, socket, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { initCallListeners } = useCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (socket) {
      initCallListeners(socket);
    }
  }, [socket, initCallListeners]);

  // Request notification permission when user is authenticated
  useEffect(() => {
    if (authUser && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [authUser]);

  // Global socket listener for background notifications & unread tab indicator
  useEffect(() => {
    if (!socket) return;

    const handleNewMessageGlobal = (message) => {
      const { selectedUser, users } = useChatStore.getState();
      const isChatActive = selectedUser && selectedUser._id === message.senderId;
      const isTabFocused = !document.hidden;

      // If we are not actively viewing this chat or the tab is running in the background
      if (!isChatActive || !isTabFocused) {
        // Prepend red dot to tab title
        if (!document.title.startsWith("🔴 ")) {
          document.title = "🔴 " + document.title;
        }

        // Retrieve sender information
        const sender = users.find((u) => u._id === message.senderId);
        const senderName = sender ? sender.fullName : "A friend";
        const bodyText = message.image ? "📷 Sent an image" : message.text;

        showDesktopNotification(`New message from ${senderName}`, bodyText, sender);
      }
    };

    const handleIncomingCallGlobal = ({ from, callType }) => {
      const isTabFocused = !document.hidden;

      if (!isTabFocused) {
        // Prepend red dot to tab title
        if (!document.title.startsWith("🔴 ")) {
          document.title = "🔴 " + document.title;
        }

        showDesktopNotification(
          `Incoming Call`,
          `${from.fullName} is calling you for a ${callType} call`,
          from
        );
      }
    };

    socket.on("newMessage", handleNewMessageGlobal);
    socket.on("incoming-call", handleIncomingCallGlobal);

    return () => {
      socket.off("newMessage", handleNewMessageGlobal);
      socket.off("incoming-call", handleIncomingCallGlobal);
    };
  }, [socket]);

  // Remove notification red dot from tab name once tab is focused
  useEffect(() => {
    const clearNotificationDot = () => {
      if (document.title.startsWith("🔴 ")) {
        document.title = document.title.replace("🔴 ", "");
      }
    };

    window.addEventListener("focus", clearNotificationDot);
    
    const handleVisibility = () => {
      if (!document.hidden) {
        clearNotificationDot();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", clearNotificationDot);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  console.log({ authUser });

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen" data-theme={theme}>
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="min-h-screen">
      <Navbar />

      <div className="pt-16 min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/verify-otp" element={!authUser ? <VerifyOtpPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        </Routes>
      </div>

      <CallModal />
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
};

export default App;
