import { useEffect } from "react";
import { useCallLogStore } from "../store/useCallLogStore";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, Video, PhoneCall, PhoneMissed, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const CallLogsPage = () => {
  const { callLogs, getCallLogs, isLogsLoading } = useCallLogStore();
  const { initiateCall } = useCallStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    getCallLogs();
  }, [getCallLogs]);

  const formatDuration = (secs) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl border border-base-content/10 overflow-hidden shadow-xl">
          
          {/* Header */}
          <div className="p-6 border-b border-base-content/10 bg-base-200/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-base-content flex items-center gap-2.5">
                <PhoneCall className="size-5.5 text-primary" />
                Call History
              </h2>
              <p className="text-xs text-base-content/60 mt-1">
                Your recent voice and video call logs
              </p>
            </div>
          </div>

          {/* List Content */}
          <div className="p-6">
            {isLogsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="text-xs text-base-content/60 font-semibold tracking-wide uppercase">Loading calls...</span>
              </div>
            ) : callLogs.length === 0 ? (
              <div className="text-center py-20 max-w-sm mx-auto">
                <div className="size-16 bg-base-200/60 rounded-2xl flex items-center justify-center mx-auto border border-base-content/5 mb-4 shadow-sm">
                  <Phone className="size-8 text-base-content/40" />
                </div>
                <h3 className="font-bold text-base text-base-content">No call history</h3>
                <p className="text-xs text-base-content/60 mt-1.5 leading-relaxed">
                  Calls you make or receive on your account will be logged here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
                {callLogs.map((log) => {
                  const isOutgoing = log.callerId._id === authUser._id;
                  const peerUser = isOutgoing ? log.receiverId : log.callerId;
                  const isVideo = log.callType === "video";
                  const avatarUrl = peerUser.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(peerUser.fullName || "")}`;

                  // Status details mapping
                  let statusColor = "text-base-content/70";
                  let StatusIcon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
                  let statusLabel = isOutgoing ? "Outgoing" : "Incoming";

                  if (log.status === "missed") {
                    statusColor = "text-red-500";
                    StatusIcon = PhoneMissed;
                    statusLabel = "Missed";
                  } else if (log.status === "rejected") {
                    statusColor = "text-orange-500";
                    statusLabel = isOutgoing ? "Declined" : "Rejected";
                  } else if (log.status === "completed") {
                    statusColor = "text-emerald-500";
                    statusLabel = isOutgoing ? "Outgoing Call" : "Incoming Call";
                  }

                  return (
                    <div
                      key={log._id}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-base-content/5 bg-base-200/20 hover:bg-base-200/50 transition-all duration-200 shadow-sm"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={avatarUrl}
                          alt={peerUser.fullName}
                          className="size-11 rounded-full border border-base-content/10 object-cover shadow-sm shrink-0"
                        />
                        <div className="text-left min-w-0">
                          <h4 className="text-sm font-bold text-base-content truncate">
                            {peerUser.fullName}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs">
                            <span className={`font-medium flex items-center gap-1.5 ${statusColor}`}>
                              <StatusIcon className="size-3.5" />
                              {statusLabel}
                            </span>
                            
                            <span className="text-base-content/30">•</span>
                            
                            <span className="text-base-content/60 font-medium">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Type, Duration, and Redial Button */}
                      <div className="flex items-center gap-4.5 shrink-0">
                        {/* Duration */}
                        <div className="text-right">
                          <div className="text-xs font-bold text-base-content/80">
                            {isVideo ? "Video" : "Voice"}
                          </div>
                          {log.status === "completed" && (
                            <div className="text-[10px] sm:text-xs text-base-content/50 mt-0.5 flex items-center gap-1 font-medium justify-end">
                              <Clock className="size-3" />
                              {formatDuration(log.duration)}
                            </div>
                          )}
                        </div>

                        {/* Callback Quick Action */}
                        <button
                          onClick={() => initiateCall(peerUser, log.callType)}
                          className="btn btn-circle btn-primary size-9 flex items-center justify-center hover:scale-105 active:scale-95 btn-tactile shadow-md shadow-primary/20 cursor-pointer"
                          title={`Call back ${peerUser.fullName}`}
                        >
                          {isVideo ? <Video className="size-4" /> : <Phone className="size-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CallLogsPage;
