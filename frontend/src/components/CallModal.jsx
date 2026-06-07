import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, RefreshCw } from "lucide-react";

const CallModal = () => {
  const {
    callState,
    callType,
    caller,
    callee,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneInterval = useRef(null);
  const audioCtx = useRef(null);

  // Web Audio Synthesized Ringtone
  const startRingtone = (type) => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx.current = new AudioCtx();

      const playTone = () => {
        if (!audioCtx.current || audioCtx.current.state === "closed") return;
        
        const osc1 = audioCtx.current.createOscillator();
        const osc2 = audioCtx.current.createOscillator();
        const gainNode = audioCtx.current.createGain();

        osc1.type = "sine";
        osc2.type = "sine";

        if (type === "dialing") {
          // Standard US/UK ringback tone (440Hz + 480Hz)
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
        } else {
          // Standard Europe/pulsing incoming ringtone (400Hz + 450Hz)
          osc1.frequency.value = 400;
          osc2.frequency.value = 450;
        }

        gainNode.gain.setValueAtTime(0, audioCtx.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.current.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, audioCtx.current.currentTime + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 1.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.current.destination);

        osc1.start();
        osc2.start();

        osc1.stop(audioCtx.current.currentTime + 1.4);
        osc2.stop(audioCtx.current.currentTime + 1.4);
      };

      playTone();
      ringtoneInterval.current = setInterval(playTone, 3000);
    } catch (e) {
      console.warn("Failed to play synthesized ringtone:", e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneInterval.current) {
      clearInterval(ringtoneInterval.current);
      ringtoneInterval.current = null;
    }
    if (audioCtx.current) {
      audioCtx.current.close().catch(() => {});
      audioCtx.current = null;
    }
  };

  // Manage Ringtone Sound based on Call State
  useEffect(() => {
    if (callState === "dialing") {
      startRingtone("dialing");
    } else if (callState === "incoming") {
      startRingtone("incoming");
    } else {
      stopRingtone();
    }

    return () => stopRingtone();
  }, [callState]);

  // Bind local/remote streams to video tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  if (callState === "idle") return null;

  const otherUser = callState === "incoming" ? caller : callee;
  const avatarUrl = otherUser?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherUser?.fullName || "")}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-up">
      
      {/* 1. Dialing Screen */}
      {callState === "dialing" && (
        <div className="glass-card p-8 rounded-3xl w-full max-w-sm flex flex-col items-center gap-6 border border-white/20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="relative size-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <img
                src={avatarUrl}
                alt="Avatar"
                className="size-28 rounded-full border-4 border-primary/30 object-cover shadow-lg relative z-10"
              />
            </div>
            <h3 className="text-xl font-bold mt-6 text-base-content">{otherUser?.fullName}</h3>
            <p className="text-sm text-primary font-medium tracking-wide animate-pulse mt-2 uppercase">
              Calling ({callType})...
            </p>
          </div>

          <button
            onClick={endCall}
            className="btn btn-circle btn-error size-14 btn-tactile shadow-lg shadow-error/30 hover:scale-105 active:scale-95 flex items-center justify-center mt-4"
          >
            <PhoneOff className="size-6 text-white" />
          </button>
        </div>
      )}

      {/* 2. Incoming Screen */}
      {callState === "incoming" && (
        <div className="glass-card p-8 rounded-3xl w-full max-w-sm flex flex-col items-center gap-6 border border-white/20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="relative size-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse size-full scale-125" />
              <img
                src={avatarUrl}
                alt="Avatar"
                className="size-28 rounded-full border-4 border-emerald-500/30 object-cover shadow-lg relative z-10"
              />
            </div>
            <h3 className="text-xl font-bold mt-6 text-base-content">{otherUser?.fullName}</h3>
            <p className="text-sm text-emerald-500 font-medium tracking-wide animate-pulse mt-2 uppercase">
              Incoming {callType} Call...
            </p>
          </div>

          <div className="flex gap-8 mt-4 z-10">
            <button
              onClick={rejectCall}
              className="btn btn-circle btn-error size-14 btn-tactile shadow-lg shadow-error/30 hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Decline"
            >
              <PhoneOff className="size-6 text-white" />
            </button>
            <button
              onClick={answerCall}
              className="btn btn-circle btn-success size-14 btn-tactile shadow-lg shadow-success/30 hover:scale-105 active:scale-95 flex items-center justify-center animate-bounce"
              title="Answer"
            >
              {callType === "video" ? (
                <Video className="size-6 text-white" />
              ) : (
                <Phone className="size-6 text-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Active Call Screen */}
      {callState === "active" && (
        <div className="glass-card rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col border border-white/20 shadow-2xl relative overflow-hidden bg-zinc-950">
          
          {/* Active Call UI representation */}
          {callType === "video" ? (
            // Video Call Rendering
            <div className="relative flex-1 bg-black">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
                  <RefreshCw className="size-10 animate-spin text-primary" />
                  <p className="text-sm font-semibold tracking-wide uppercase">Connecting remote video...</p>
                </div>
              )}

              {/* Local PiP Video overlay */}
              <div className="absolute bottom-4 right-4 w-32 sm:w-44 h-48 sm:h-60 rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-zinc-900 z-20">
                {isCameraOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                    <VideoOff className="size-8" />
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                )}
              </div>
            </div>
          ) : (
            // Voice Call Rendering
            <div className="flex-1 flex flex-col items-center justify-center gap-12 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_60%)]" />
              
              <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-16 z-10">
                {/* Caller Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-24 sm:size-32">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse size-full scale-110" />
                    <img
                      src={caller?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(caller?.fullName || "")}`}
                      alt={caller?.fullName}
                      className="size-24 sm:size-32 rounded-full border-2 border-primary/50 object-cover shadow-lg"
                    />
                  </div>
                  <span className="text-sm font-bold text-zinc-400">{caller?.fullName}</span>
                </div>

                <div className="flex items-center gap-1.5 h-6">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce delay-75" />
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-300" />
                </div>

                {/* Callee Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-24 sm:size-32">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse size-full scale-110" />
                    <img
                      src={callee?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(callee?.fullName || "")}`}
                      alt={callee?.fullName}
                      className="size-24 sm:size-32 rounded-full border-2 border-primary/50 object-cover shadow-lg"
                    />
                  </div>
                  <span className="text-sm font-bold text-zinc-400">{callee?.fullName}</span>
                </div>
              </div>

              <div className="text-center z-10">
                <span className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  Active Call
                </span>
              </div>
            </div>
          )}

          {/* Active Call Controls panel */}
          <div className="p-6 bg-zinc-900/90 border-t border-white/10 flex items-center justify-center gap-6 sm:gap-8 z-30">
            {/* Toggle Mic */}
            <button
              onClick={toggleMute}
              className={`btn btn-circle size-12 btn-tactile border border-white/10 flex items-center justify-center shadow-lg transition-colors ${
                isMuted
                  ? "bg-amber-500 text-white hover:bg-amber-600 hover:border-amber-600"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="btn btn-circle btn-error size-14 btn-tactile shadow-lg shadow-error/30 hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Hang Up"
            >
              <PhoneOff className="size-6 text-white" />
            </button>

            {/* Toggle Camera (Video Call Only) */}
            {callType === "video" && (
              <button
                onClick={toggleCamera}
                className={`btn btn-circle size-12 btn-tactile border border-white/10 flex items-center justify-center shadow-lg transition-colors ${
                  isCameraOff
                    ? "bg-amber-500 text-white hover:bg-amber-600 hover:border-amber-600"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default CallModal;
