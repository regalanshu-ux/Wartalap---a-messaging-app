import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { LogOut, Settings, User, Home, UserPlus, Check, X, Search, Clock, UserCheck } from "lucide-react";

const Navbar = () => {
  const { logout, authUser, socket } = useAuthStore();
  const {
    pendingRequests,
    getRequests,
    acceptRequest,
    rejectRequest,
    subscribeToFriendEvents,
    unsubscribeFromFriendEvents,
    searchResults,
    searchUsers,
    sendRequest,
    cancelRequest,
    isSearching,
  } = useFriendStore();

  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const requestsDropdownRef = useRef(null);
  const findDropdownRef = useRef(null);

  useEffect(() => {
    if (authUser) {
      getRequests();
    }
  }, [authUser, getRequests]);

  useEffect(() => {
    if (authUser && socket) {
      subscribeToFriendEvents();
      return () => unsubscribeFromFriendEvents();
    }
  }, [authUser, socket, subscribeToFriendEvents, unsubscribeFromFriendEvents]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (requestsDropdownRef.current && !requestsDropdownRef.current.contains(event.target)) {
        setIsRequestsOpen(false);
      }
      if (findDropdownRef.current && !findDropdownRef.current.contains(event.target)) {
        setIsFindOpen(false);
        setSearchQuery("");
        searchUsers(""); // Clean up store results
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchUsers]);

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <img src="/logo.jpg" alt="Logo" className="size-9 object-cover rounded-lg border border-base-300" />
              <h1 className="text-lg font-bold">वार्तालाप</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={"/settings"}
              className={`
              btn btn-sm gap-2 transition-colors
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/"} className="btn btn-sm gap-2">
                  <Home className="size-4" />
                  <span className="hidden sm:inline">Chats</span>
                </Link>

                {/* Find Friends Dropdown */}
                <div className="relative" ref={findDropdownRef}>
                  <button
                    onClick={() => {
                      setIsFindOpen(!isFindOpen);
                      setIsRequestsOpen(false);
                    }}
                    className={`btn btn-sm gap-2 transition-all ${
                      isFindOpen ? "btn-active bg-base-200" : ""
                    }`}
                  >
                    <Search className="size-4" />
                    <span className="hidden sm:inline">Find Friends</span>
                  </button>

                  {isFindOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3.5 border-b border-base-300 bg-base-200/50">
                        <h3 className="font-semibold text-sm">Find Friends</h3>
                      </div>

                      <div className="p-3.5">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by username or email..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              searchUsers(e.target.value);
                            }}
                            className="input input-bordered w-full pl-9 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-base-200/50"
                            autoFocus
                          />
                          <Search className="size-4 absolute left-3 top-3 text-base-content/40" />
                        </div>

                        <div className="mt-4 max-h-60 overflow-y-auto">
                          {searchQuery.trim() === "" ? (
                            <div className="py-6 text-center text-xs text-base-content/50">
                              Type the exact username or email to search.
                            </div>
                          ) : isSearching ? (
                            <div className="py-6 text-center">
                              <span className="loading loading-spinner loading-sm text-primary"></span>
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="py-6 text-center text-xs text-base-content/50">
                              No users found
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {searchResults.map((user) => (
                                <div
                                  key={user._id}
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-base-200/40 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                                      alt={user.fullName}
                                      className="size-8 object-cover rounded-full border border-base-300"
                                    />
                                    <div className="text-left min-w-0">
                                      <div className="text-xs font-semibold truncate">{user.fullName}</div>
                                      <div className="text-[10px] text-base-content/60 truncate">@{user.username}</div>
                                    </div>
                                  </div>

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
                                          className="btn btn-xs btn-success btn-square size-6"
                                          title="Accept"
                                        >
                                          <Check className="size-3" />
                                        </button>
                                        <button
                                          onClick={() => rejectRequest(user._id)}
                                          className="btn btn-xs btn-error btn-square size-6"
                                          title="Decline"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      </div>
                                    )}
                                    {user.relationship === "accepted" && (
                                      <span className="text-[10px] font-semibold text-success flex items-center gap-1">
                                        <UserCheck className="size-3" />
                                        Friends
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Friend Requests Dropdown */}
                <div className="relative" ref={requestsDropdownRef}>
                  <button
                    onClick={() => {
                      setIsRequestsOpen(!isRequestsOpen);
                      setIsFindOpen(false);
                    }}
                    className={`btn btn-sm gap-2 transition-all relative ${
                      isRequestsOpen ? "btn-active bg-base-200" : ""
                    }`}
                  >
                    <UserPlus className="size-4" />
                    <span className="hidden sm:inline">Requests</span>
                    {pendingRequests.incoming.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-content animate-bounce shadow-md">
                        {pendingRequests.incoming.length}
                      </span>
                    )}
                  </button>

                  {isRequestsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3.5 border-b border-base-300 bg-base-200/50 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Friend Requests</h3>
                        <span className="text-xs bg-base-300 px-2.5 py-0.5 rounded-full font-medium">
                          {pendingRequests.incoming.length} Pending
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-base-200">
                        {pendingRequests.incoming.length === 0 ? (
                          <div className="p-6 text-center text-sm text-base-content/50">
                            <UserPlus className="size-8 mx-auto mb-2 text-base-content/30" />
                            <p>No pending friend requests</p>
                          </div>
                        ) : (
                          pendingRequests.incoming.map((request) => (
                            <div key={request._id} className="p-3 flex items-center justify-between gap-3 hover:bg-base-200/30 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={request.senderId.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(request.senderId.fullName)}`}
                                  alt={request.senderId.fullName}
                                  className="size-9 object-cover rounded-full border border-base-300"
                                />
                                <div className="text-left min-w-0">
                                  <div className="text-xs font-semibold truncate">{request.senderId.fullName}</div>
                                  <div className="text-[10px] text-base-content/60 truncate">@{request.senderId.username}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => acceptRequest(request.senderId._id)}
                                  className="btn btn-xs btn-success btn-square size-6 flex items-center justify-center rounded-md hover:scale-105 transition-transform"
                                  title="Accept"
                                >
                                  <Check className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => rejectRequest(request.senderId._id)}
                                  className="btn btn-xs btn-error btn-square size-6 flex items-center justify-center rounded-md hover:scale-105 transition-transform"
                                  title="Decline"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="btn btn-sm gap-2" onClick={logout}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
