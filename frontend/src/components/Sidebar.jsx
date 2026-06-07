import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, unreadMessages } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-content/10 flex flex-col transition-all duration-300">
      <div className="border-b border-base-content/10 p-5 w-full bg-base-200/10">
        <div className="flex items-center gap-2.5">
          <Users className="size-5 text-primary" />
          <span className="font-bold text-sm tracking-wide hidden lg:block uppercase opacity-80">Contacts</span>
        </div>

        {/* Online filter toggle */}
        <div className="mt-3.5 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 text-xs select-none">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-xs rounded checkbox-primary"
            />
            <span className="text-base-content/70 font-medium">Show online only</span>
          </label>
          <span className="text-[10px] bg-base-content/10 text-base-content px-2 py-0.5 rounded-full font-bold">
            {Math.max(0, onlineUsers.length - 1)} Online
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full flex-1 divide-y divide-base-content/5">
        {filteredUsers.length === 0 ? (
          <div className="text-center text-base-content/50 py-12 px-4 space-y-2">
            <Users className="size-8 mx-auto text-base-content/30" />
            <p className="text-sm font-semibold">No connections yet</p>
            <p className="text-xs text-base-content/40 max-w-[200px] mx-auto hidden lg:block leading-relaxed">
              Use "Find Friends" in the top navbar to search and connect with other users!
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;
            const unreads = unreadMessages[user._id] || [];
            const unreadCount = unreads.length;

            return (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-4 flex items-center gap-3.5 hover:bg-base-200/35 active:bg-base-200/60 transition-all border-l-4 text-left ${
                  isSelected
                    ? "bg-base-200/50 border-primary shadow-inner"
                    : "border-transparent"
                }`}
              >
                {/* Avatar with online/offline badge */}
                <div className="relative mx-auto lg:mx-0 shrink-0">
                  <img
                    src={user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                    alt={user.fullName}
                    className="size-11 object-cover rounded-full border border-base-content/15 shadow-sm"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100 animate-pulse shadow-md" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-3 bg-primary rounded-full ring-2 ring-base-100 animate-pulse lg:hidden shadow-md" />
                  )}
                </div>

                {/* User Info - visible on larger viewports */}
                <div className="hidden lg:block min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{user.fullName}</div>
                  <div className={`text-xs truncate font-medium mt-0.5 ${
                    isOnline ? "text-green-500" : "text-base-content/50"
                  }`}>
                    {isOnline ? "Online" : "Offline"}
                  </div>
                </div>

                {/* Unread Message Badge */}
                {unreadCount > 0 && (
                  <div className="size-5 rounded-full bg-primary text-primary-content text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-primary/20 shrink-0 hidden lg:flex">
                    {unreadCount}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
