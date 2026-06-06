import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { LogOut, Settings, User, Home, UserPlus, Check, X } from "lucide-react";

const Navbar = () => {
  const { logout, authUser, socket } = useAuthStore();
  const {
    pendingRequests,
    getRequests,
    acceptRequest,
    rejectRequest,
    subscribeToFriendEvents,
    unsubscribeFromFriendEvents,
  } = useFriendStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

                {/* Friend Requests Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`btn btn-sm gap-2 transition-all relative ${
                      isOpen ? "btn-active bg-base-200" : ""
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

                  {isOpen && (
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
