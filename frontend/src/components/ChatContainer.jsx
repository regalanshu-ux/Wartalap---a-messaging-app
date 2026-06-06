import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";

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
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatMessageTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      {/* Auto-delete policy banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center justify-center gap-1.5 select-none">
        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        Messages are automatically deleted 24 hours after they are sent.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isFromMe = message.senderId === authUser._id;
          const userAvatar = isFromMe
            ? authUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authUser.fullName)}`
            : selectedUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.fullName)}`;

          return (
            <div key={message._id} className={`chat ${isFromMe ? "chat-end" : "chat-start"}`}>
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border border-base-300">
                  <img src={userAvatar} alt="Profile" className="object-cover" />
                </div>
              </div>

              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div className="chat-bubble flex flex-col gap-1">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="max-w-[200px] rounded-md mb-1 border border-base-300"
                  />
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
