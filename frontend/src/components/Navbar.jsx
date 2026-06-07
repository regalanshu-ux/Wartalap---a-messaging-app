import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, User, Home, UserPlus, Check, X, Search, Clock, UserCheck, Sun, Moon } from "lucide-react";

const Navbar = () => {
  const { logout, authUser, socket } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
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
      className="backdrop-blur-md bg-base-100/75 border-b border-base-content/10 fixed w-full top-0 z-40 shadow-sm transition-all duration-300"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 active:scale-95 transition-all">
              <div className="relative overflow-hidden rounded-xl size-9 border border-base-content/15 flex items-center justify-center">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-secondary bg-clip-text text-transparent">
                वार्तालाप
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn btn-sm h-9 w-9 p-0 rounded-lg border border-base-content/10 bg-base-200/50 hover:bg-base-200 hover:border-base-content/20 btn-tactile flex items-center justify-center cursor-pointer"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? (
                <Sun className="size-4.5 text-yellow-500 animate-pulse" />
              ) : (
                <Moon className="size-4.5 text-indigo-500" />
              )}
            </button>

            {authUser && (
              <>
                <Link
                  to={"/"}
                  className="btn btn-sm h-9 px-3 rounded-lg border border-base-content/10 bg-base-200/50 hover:bg-base-200 hover:border-base-content/20 btn-tactile gap-2 font-medium"
                >
                  <Home className="size-4 text-base-content/75" />
                  <span className="hidden sm:inline">Chats</span>
                </Link>

                {/* Find Friends Dropdown */}
                <div className="relative" ref={findDropdownRef}>
                  <button
                    onClick={() => {
                      setIsFindOpen(!isFindOpen);
                      setIsRequestsOpen(false);
                    }}
                    className={`btn btn-sm h-9 px-3 rounded-lg border btn-tactile gap-2 font-medium transition-all ${
                      isFindOpen
                        ? "bg-primary text-primary-content border-primary shadow-lg shadow-primary/20"
                        : "border-base-content/10 bg-base-200/50 hover:bg-base-200 hover:border-base-content/20"
                    }`}
                  >
                    <Search className="size-4" />
                    <span className="hidden sm:inline">Find Friends</span>
                  </button>

                  {isFindOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 glass-card rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-up border border-base-content/15">
                      <div className="p-4 border-b border-base-content/10 bg-base-200/40">
                        <h3 className="font-bold text-sm tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Find Friends</h3>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by username or email..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              searchUsers(e.target.value);
                            }}
                            className="input input-bordered w-full pl-9 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-base-200/50 rounded-xl border-base-content/10"
                            autoFocus
                          />
                          <Search className="size-4 absolute left-3 top-3 text-base-content/40" />
                        </div>

                        <div className="max-h-60 overflow-y-auto pr-1">
                          {searchQuery.trim() === "" ? (
                            <div className="py-8 text-center text-xs text-base-content/50">
                              Type the exact username or email to search.
                            </div>
                          ) : isSearching ? (
                            <div className="py-8 text-center">
                              <span className="loading loading-spinner loading-sm text-primary"></span>
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="py-8 text-center text-xs text-base-content/50">
                              No users found
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {searchResults.map((user) => (
                                <div
                                  key={user._id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-base-200/50 transition-all duration-200"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={user.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`}
                                      alt={user.fullName}
                                      className="size-9 object-cover rounded-full border border-base-content/10"
                                    />
                                    <div className="text-left min-w-0">
                                      <div className="text-xs font-bold truncate">{user.fullName}</div>
                                      <div className="text-[10px] text-base-content/60 truncate">@{user.username}</div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {user.relationship === "none" && (
                                      <button
                                        onClick={() => sendRequest(user._id)}
                                        className="btn btn-xs btn-primary gap-1 rounded-lg font-bold px-2.5 h-7 shadow shadow-primary/10 btn-tactile"
                                      >
                                        <UserPlus className="size-3" />
                                        Add
                                      </button>
                                    )}
                                    {user.relationship === "sent" && (
                                      <button
                                        onClick={() => cancelRequest(user._id)}
                                        className="btn btn-xs btn-outline btn-secondary gap-1 rounded-lg font-bold px-2.5 h-7 btn-tactile"
                                      >
                                        <Clock className="size-3" />
                                        Cancel
                                      </button>
                                    )}
                                    {user.relationship === "received" && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => acceptRequest(user._id)}
                                          className="btn btn-xs btn-success btn-square size-7 flex items-center justify-center rounded-lg shadow shadow-success/15 btn-tactile text-success-content"
                                          title="Accept"
                                        >
                                          <Check className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={() => rejectRequest(user._id)}
                                          className="btn btn-xs btn-error btn-square size-7 flex items-center justify-center rounded-lg shadow shadow-error/15 btn-tactile text-error-content"
                                          title="Decline"
                                        >
                                          <X className="size-3.5" />
                                        </button>
                                      </div>
                                    )}
                                    {user.relationship === "accepted" && (
                                      <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success/10 py-1 px-2.5 rounded-lg">
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
                    className={`btn btn-sm h-9 px-3 rounded-lg border btn-tactile gap-2 font-medium transition-all relative ${
                      isRequestsOpen
                        ? "bg-primary text-primary-content border-primary shadow-lg shadow-primary/20"
                        : "border-base-content/10 bg-base-200/50 hover:bg-base-200 hover:border-base-content/20"
                    }`}
                  >
                    <UserPlus className="size-4" />
                    <span className="hidden sm:inline">Requests</span>
                    {pendingRequests.incoming.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-extrabold text-secondary-content shadow-lg animate-pulse">
                        {pendingRequests.incoming.length}
                      </span>
                    )}
                  </button>

                  {isRequestsOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 glass-card rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-up border border-base-content/15">
                      <div className="p-4 border-b border-base-content/10 bg-base-200/40 flex justify-between items-center">
                        <h3 className="font-bold text-sm tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Friend Requests</h3>
                        <span className="text-[10px] font-bold bg-base-content/10 text-base-content px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {pendingRequests.incoming.length} Pending
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-base-content/5 pr-1">
                        {pendingRequests.incoming.length === 0 ? (
                          <div className="p-8 text-center text-sm text-base-content/50">
                            <UserPlus className="size-8 mx-auto mb-2 text-base-content/30" />
                            <p className="font-semibold">No pending friend requests</p>
                          </div>
                        ) : (
                          pendingRequests.incoming.map((request) => (
                            <div key={request._id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-base-200/35 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={request.senderId.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(request.senderId.fullName)}`}
                                  alt={request.senderId.fullName}
                                  className="size-9 object-cover rounded-full border border-base-content/10"
                                />
                                <div className="text-left min-w-0">
                                  <div className="text-xs font-bold truncate">{request.senderId.fullName}</div>
                                  <div className="text-[10px] text-base-content/60 truncate">@{request.senderId.username}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => acceptRequest(request.senderId._id)}
                                  className="btn btn-xs btn-success btn-square size-7 flex items-center justify-center rounded-lg shadow shadow-success/15 btn-tactile text-success-content"
                                  title="Accept"
                                >
                                  <Check className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => rejectRequest(request.senderId._id)}
                                  className="btn btn-xs btn-error btn-square size-7 flex items-center justify-center rounded-lg shadow shadow-error/15 btn-tactile text-error-content"
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

                <Link
                  to={"/profile"}
                  className="btn btn-sm h-9 px-3 rounded-lg border border-base-content/10 bg-base-200/50 hover:bg-base-200 hover:border-base-content/20 btn-tactile gap-2 font-medium"
                >
                  <User className="size-4 text-base-content/75" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  className="btn btn-sm h-9 px-3 rounded-lg border border-red-500/10 hover:border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10 btn-tactile gap-2 font-medium"
                  onClick={logout}
                >
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
