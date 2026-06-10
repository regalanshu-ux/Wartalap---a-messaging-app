import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Info, Phone, Video, Clock } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const { initiateCall } = useCallStore();
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messagesContainerRef.current && messages) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const formatDuration = (secs) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatMessageTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-100/30">
      <ChatHeader />

      {/* Auto-delete policy banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center justify-center gap-2 select-none shadow-sm backdrop-blur-sm">
        <Info className="size-4 text-amber-600 dark:text-amber-400" />
        <span>Messages are automatically deleted 24 hours after they are sent.</span>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isFromMe = message.senderId === authUser._id;
          const userAvatar = isFromMe
            ? authUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authUser.fullName)}`
            : selectedUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.fullName)}`;

          const isCall = message.messageType === "call";

          return (
            <div key={message._id} className={`chat ${isFromMe ? "chat-end" : "chat-start"} animate-fade-in-up`}>
              <div className="chat-image avatar">
                <div className="size-9 rounded-full border border-base-content/10 shadow-sm overflow-hidden">
                  <img src={userAvatar} alt="Profile" className="object-cover w-full h-full" />
                </div>
              </div>

              <div className="chat-header mb-1 opacity-60">
                <time className="text-[10px] font-medium ml-1.5">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              {isCall ? (
                <div
                  className={`chat-bubble flex flex-col gap-2 p-3 sm:p-3.5 min-w-[190px] border border-base-content/10 shadow-sm rounded-2xl ${
                    isFromMe
                      ? "rounded-tr-none bg-gradient-to-tr from-primary/10 to-indigo-600/10 text-base-content"
                      : "rounded-tl-none bg-base-200/60 text-base-content"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`size-8 rounded-xl flex items-center justify-center ${
                      message.callDetails?.status === "missed" ? "bg-red-500/15 text-red-500" :
                      message.callDetails?.status === "rejected" ? "bg-orange-500/15 text-orange-500" :
                      "bg-emerald-500/15 text-emerald-500"
                    }`}>
                      {message.callDetails?.callType === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
                    </div>
                    
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold leading-tight">
                        {message.callDetails?.status === "missed" ? "Missed Call" :
                         message.callDetails?.status === "rejected" ? "Declined Call" :
                         message.callDetails?.status === "completed" ? "Call Ended" : "Call"}
                      </div>
                      
                      <div className="text-[10px] text-base-content/60 mt-0.5 font-medium">
                        {message.callDetails?.callType === "video" ? "Video call" : "Voice call"}
                        {message.callDetails?.status === "completed" && ` • ${formatDuration(message.callDetails.duration)}`}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => initiateCall(selectedUser, message.callDetails?.callType || "voice")}
                    className="btn btn-xs btn-outline btn-primary w-full gap-1 mt-1 font-bold rounded-lg border-base-content/10 hover:border-primary/30 cursor-pointer"
                  >
                    Call Back
                  </button>
                </div>
              ) : (
                <div
                  className={`chat-bubble flex flex-col gap-1 p-3.5 max-w-[75%] border-none shadow-sm ${
                    isFromMe
                      ? "rounded-2xl rounded-tr-none bg-gradient-to-tr from-primary to-indigo-600 text-primary-content font-medium"
                      : "rounded-2xl rounded-tl-none bg-base-200/60 text-base-content border border-base-content/5"
                  }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="max-w-full sm:max-w-[240px] rounded-xl mb-1.5 border border-base-content/10 shadow-inner"
                    />
                  )}
                  {message.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
