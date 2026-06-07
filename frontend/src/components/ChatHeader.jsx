import { X, Phone, Video, ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();
  const isOnline = onlineUsers.includes(selectedUser?._id);

  if (!selectedUser) return null;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.fullName)}`}
                alt={selectedUser.fullName}
                className="object-cover"
              />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-xs text-base-content/70">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Call buttons */}
          <button
            onClick={() => initiateCall(selectedUser, "voice")}
            className="btn btn-ghost btn-sm btn-circle text-base-content/75 hover:text-primary transition-all"
            title="Start Voice Call"
          >
            <Phone className="size-4.5" />
          </button>

          <button
            onClick={() => initiateCall(selectedUser, "video")}
            className="btn btn-ghost btn-sm btn-circle text-base-content/75 hover:text-primary transition-all"
            title="Start Video Call"
          >
            <Video className="size-4.5" />
          </button>

          {/* Back/Close button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-sm btn-circle text-base-content/75 hover:text-error transition-all"
            title="Back to Chats"
          >
            <ArrowLeft className="size-4.5 lg:hidden" />
            <X className="size-4.5 hidden lg:block" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
