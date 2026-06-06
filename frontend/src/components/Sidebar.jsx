import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UserPlus, Search, Check, X, Clock, UserCheck } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" | "find"
  const [searchQuery, setSearchQuery] = useState("");

  const {
    getRequests,
    pendingRequests,
    searchUsers,
    searchResults,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useFriendStore();

  useEffect(() => {
    getUsers();
    getRequests();
  }, [getUsers, getRequests]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header / Tabs Container */}
      <div className="flex border-b border-base-300">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "chats"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/30"
          }`}
        >
          <Users className="size-4" />
          <span className="hidden lg:inline">Chats</span>
        </button>
        <button
          onClick={() => setActiveTab("find")}
          className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors relative hidden lg:flex ${
            activeTab === "find"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/30"
          }`}
        >
          <UserPlus className="size-4" />
          <span>Add Friends</span>
          {pendingRequests.incoming.length > 0 && (
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full ring-2 ring-base-100 animate-pulse" />
          )}
        </button>
      </div>

      {/* Conditional Header for Chats Tab */}
      {activeTab === "chats" && (
        <div className="border-b border-base-300 p-5 w-full">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-semibold hidden lg:block">Contacts</span>
          </div>

          {/* Online filter toggle */}
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 text-xs select-none">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="text-base-content/70">Show online only</span>
            </label>
            <span className="text-xs text-base-content/50">({Math.max(0, onlineUsers.length - 1)} online)</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="overflow-y-auto w-full flex-1">
        {activeTab === "chats" ? (
          /* Chats List */
          filteredUsers.length === 0 ? (
            <div className="text-center text-base-content/50 py-8 px-4">
              <Users className="size-8 mx-auto mb-2 text-base-content/30" />
              <p className="text-sm">No connections yet</p>
              <p className="text-xs text-base-content/40 mt-1 hidden lg:block">
                Search and add friends under the "Add Friends" tab to start chatting!
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline = onlineUsers.includes(user._id);
              const isSelected = selectedUser?._id === user._id;

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-base-200/50 transition-colors ${
                    isSelected ? "bg-base-200 ring-1 ring-base-300" : ""
                  }`}
                >
                  {/* Avatar with online/offline badge */}
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                      alt={user.fullName}
                      className="size-12 object-cover rounded-full border border-base-300"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100 animate-pulse" />
                    )}
                  </div>

                  {/* User Info - visible on larger viewports */}
                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-xs truncate text-base-content/60">
                      {isOnline ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : (
          /* Find Friends Tab */
          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="p-4 border-b border-base-300">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email or username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="input input-bordered w-full pl-9 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-base-200/50"
                />
                <Search className="size-4 absolute left-3 top-3 text-base-content/40" />
              </div>
            </div>

            {/* Results & Requests List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {searchQuery.trim() !== "" ? (
                /* Search Results */
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                    Search Results
                  </h3>
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-base-content/50">No users found</p>
                  ) : (
                    searchResults.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-base-200/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                            alt={user.fullName}
                            className="size-9 object-cover rounded-full border border-base-300"
                          />
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium truncate">{user.fullName}</div>
                            <div className="text-xs text-base-content/60 truncate">@{user.username}</div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div>
                          {user.relationship === "none" && (
                            <button
                              onClick={() => sendRequest(user._id)}
                              className="btn btn-xs btn-primary gap-1"
                            >
                              <UserPlus className="size-3" />
                              Add
                            </button>
                          )}
                          {user.relationship === "sent" && (
                            <button
                              onClick={() => cancelRequest(user._id)}
                              className="btn btn-xs btn-outline btn-secondary gap-1"
                            >
                              <Clock className="size-3" />
                              Cancel
                            </button>
                          )}
                          {user.relationship === "received" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => acceptRequest(user._id)}
                                className="btn btn-xs btn-success btn-square"
                                title="Accept"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                onClick={() => rejectRequest(user._id)}
                                className="btn btn-xs btn-error btn-square"
                                title="Decline"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          )}
                          {user.relationship === "accepted" && (
                            <span className="text-xs font-semibold text-success flex items-center gap-1">
                              <UserCheck className="size-3" />
                              Friends
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Pending Requests */
                <>
                  {/* Incoming Requests */}
                  {pendingRequests.incoming.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                        Incoming Requests ({pendingRequests.incoming.length})
                      </h3>
                      {pendingRequests.incoming.map((request) => (
                        <div
                          key={request._id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200/30 border border-base-300/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={request.senderId.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(request.senderId.fullName)}`}
                              alt={request.senderId.fullName}
                              className="size-9 object-cover rounded-full border border-base-300"
                            />
                            <div className="text-left min-w-0">
                              <div className="text-sm font-medium truncate">{request.senderId.fullName}</div>
                              <div className="text-xs text-base-content/60 truncate">@{request.senderId.username}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => acceptRequest(request.senderId._id)}
                              className="btn btn-xs btn-success btn-square"
                              title="Accept"
                            >
                              <Check className="size-3" />
                            </button>
                            <button
                              onClick={() => rejectRequest(request.senderId._id)}
                              className="btn btn-xs btn-error btn-square"
                              title="Decline"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Outgoing Requests */}
                  {pendingRequests.outgoing.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                        Sent Requests ({pendingRequests.outgoing.length})
                      </h3>
                      {pendingRequests.outgoing.map((request) => (
                        <div
                          key={request._id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200/20 border border-base-300/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={request.receiverId.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(request.receiverId.fullName)}`}
                              alt={request.receiverId.fullName}
                              className="size-9 object-cover rounded-full border border-base-300"
                            />
                            <div className="text-left min-w-0">
                              <div className="text-sm font-medium truncate">{request.receiverId.fullName}</div>
                              <div className="text-xs text-base-content/60 truncate">@{request.receiverId.username}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => cancelRequest(request.receiverId._id)}
                            className="btn btn-xs btn-outline btn-secondary gap-1"
                          >
                            <X className="size-3" />
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {pendingRequests.incoming.length === 0 && pendingRequests.outgoing.length === 0 && (
                    <div className="text-center text-base-content/50 py-8 px-4">
                      <UserPlus className="size-8 mx-auto mb-2 text-base-content/30" />
                      <p className="text-sm">No pending requests</p>
                      <p className="text-xs text-base-content/40 mt-1">
                        Use the search bar above to find users by their name, email, or unique username!
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
