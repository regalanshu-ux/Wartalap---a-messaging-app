import { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, RefreshCw, Volume2, Bluetooth, Smartphone } from "lucide-react";
import { registerPlugin } from "@capacitor/core";
import toast from "react-hot-toast";

const BackgroundService = typeof window !== "undefined" && window.Capacitor
  ? registerPlugin("BackgroundService")
  : null;


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
  const remoteAudioRef = useRef(null);
  const ringtoneInterval = useRef(null);
  const audioCtx = useRef(null);

  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedSinkId, setSelectedSinkId] = useState("default");
  const [androidOutputs, setAndroidOutputs] = useState({ earpiece: true, speaker: true, bluetooth: false });
  const [currentAndroidRoute, setCurrentAndroidRoute] = useState("earpiece");
  const [isAudioRouteOpen, setIsAudioRouteOpen] = useState(false);

  // Get output devices for standard Web browsers
  const getWebAudioOutputs = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((device) => device.kind === "audiooutput");
        setAudioOutputs(outputs);
        
        const defaultDev = outputs.find(d => d.deviceId === "default") || outputs[0];
        if (defaultDev) {
          setSelectedSinkId(defaultDev.deviceId);
        }
      }
    } catch (err) {
      console.warn("Failed to enumerate audio output devices:", err);
    }
  };

  // Get available audio outputs on Android
  const getAndroidAudioOutputs = async () => {
    if (BackgroundService) {
      try {
        const res = await BackgroundService.getAvailableAudioOutputs();
        setAndroidOutputs({
          earpiece: res.earpiece !== false,
          speaker: res.speaker !== false,
          bluetooth: res.bluetooth === true
        });
      } catch (err) {
        console.warn("Failed to get Android audio outputs:", err);
      }
    }
  };

  // Apply default audio routing when call starts
  const applyDefaultRouting = async () => {
    if (window.Capacitor && BackgroundService) {
      try {
        const res = await BackgroundService.getAvailableAudioOutputs();
        const hasBluetooth = res.bluetooth === true;
        
        let initialRoute = "earpiece";
        if (callType === "video") {
          initialRoute = "speaker";
        } else if (hasBluetooth) {
          initialRoute = "bluetooth";
        }
        
        await BackgroundService.setAudioOutput({ route: initialRoute });
        setCurrentAndroidRoute(initialRoute);
        setAndroidOutputs({
          earpiece: res.earpiece !== false,
          speaker: res.speaker !== false,
          bluetooth: hasBluetooth
        });
      } catch (err) {
        console.error("Failed to set default Android audio output:", err);
      }
    } else {
      await getWebAudioOutputs();
    }
  };

  // Handle switching audio output on Web
  const handleWebSinkChange = async (sinkId) => {
    setSelectedSinkId(sinkId);
    try {
      if (remoteAudioRef.current && typeof remoteAudioRef.current.setSinkId === "function") {
        await remoteAudioRef.current.setSinkId(sinkId);
      }
      if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === "function") {
        await remoteVideoRef.current.setSinkId(sinkId);
      }
      toast.success("Audio output changed");
    } catch (err) {
      console.error("Failed to set sink ID:", err);
      toast.error("Failed to change audio device");
    }
  };

  // Handle switching audio output on Android
  const handleAndroidRouteChange = async (route) => {
    if (BackgroundService) {
      try {
        await BackgroundService.setAudioOutput({ route });
        setCurrentAndroidRoute(route);
        toast.success(`Audio routed to ${route}`);
      } catch (err) {
        console.error(`Failed to route audio to ${route}:`, err);
        toast.error(err.message || `Failed to route audio to ${route}`);
      }
    }
  };

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

  // Bind remote stream to audio element for voice-only call
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && callType === "voice") {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, callType]);

  // Handle call active audio routing lifecycle
  useEffect(() => {
    if (callState === "active") {
      applyDefaultRouting();
      
      // Setup listener/poller for device additions/removals
      if (!window.Capacitor && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener("devicechange", getWebAudioOutputs);
      }
      
      // On Android, poll for changes in available devices every 3 seconds to auto-detect Bluetooth connections
      let androidPollInterval = null;
      if (window.Capacitor) {
        androidPollInterval = setInterval(getAndroidAudioOutputs, 3000);
      }

      return () => {
        if (!window.Capacitor && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
          navigator.mediaDevices.removeEventListener("devicechange", getWebAudioOutputs);
        }
        if (androidPollInterval) {
          clearInterval(androidPollInterval);
        }
      };
    } else if (callState === "idle" || callState === "incoming" || callState === "dialing") {
      // Clean up sound routing when not in an active call
      if (window.Capacitor && BackgroundService) {
        BackgroundService.resetAudioOutput().catch((err) => {
          console.warn("Failed to reset Android audio output:", err);
        });
      }
      setIsAudioRouteOpen(false);
    }
  }, [callState]);

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
              <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
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

            {/* Sound Output Selection */}
            <div className="relative">
              <button
                onClick={() => setIsAudioRouteOpen(!isAudioRouteOpen)}
                className={`btn btn-circle size-12 btn-tactile border border-white/10 flex items-center justify-center shadow-lg transition-colors ${
                  isAudioRouteOpen
                    ? "bg-primary text-white border-primary"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
                title="Sound Output Device"
              >
                {window.Capacitor ? (
                  currentAndroidRoute === "speaker" ? <Volume2 className="size-5" /> :
                  currentAndroidRoute === "bluetooth" ? <Bluetooth className="size-5" /> :
                  <Smartphone className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>

              {isAudioRouteOpen && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] flex flex-col gap-1 text-zinc-100 animate-fade-in-up">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold px-2 py-1 select-none text-center border-b border-white/5 pb-1 mb-1">
                    Sound Output
                  </div>
                  {window.Capacitor ? (
                    <>
                      {androidOutputs.earpiece && (
                        <button
                          onClick={() => {
                            handleAndroidRouteChange("earpiece");
                            setIsAudioRouteOpen(false);
                          }}
                          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            currentAndroidRoute === "earpiece"
                              ? "bg-primary text-white font-bold"
                              : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Smartphone className="size-4 shrink-0" />
                          Earpiece
                        </button>
                      )}
                      {androidOutputs.speaker && (
                        <button
                          onClick={() => {
                            handleAndroidRouteChange("speaker");
                            setIsAudioRouteOpen(false);
                          }}
                          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            currentAndroidRoute === "speaker"
                              ? "bg-primary text-white font-bold"
                              : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Volume2 className="size-4 shrink-0" />
                          Speaker
                        </button>
                      )}
                      {androidOutputs.bluetooth && (
                        <button
                          onClick={() => {
                            handleAndroidRouteChange("bluetooth");
                            setIsAudioRouteOpen(false);
                          }}
                          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            currentAndroidRoute === "bluetooth"
                              ? "bg-primary text-white font-bold"
                              : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Bluetooth className="size-4 shrink-0" />
                          Bluetooth
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {audioOutputs.length === 0 ? (
                        <div className="text-zinc-500 text-[10px] text-center py-2">
                          No audio outputs found
                        </div>
                      ) : (
                        audioOutputs.map((device) => (
                          <button
                            key={device.deviceId}
                            onClick={() => {
                              handleWebSinkChange(device.deviceId);
                              setIsAudioRouteOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl truncate transition-all cursor-pointer ${
                              selectedSinkId === device.deviceId
                                ? "bg-primary text-white font-bold"
                                : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                            title={device.label || "Audio Device"}
                          >
                            <Volume2 className="size-4 shrink-0" />
                            <span className="truncate">{device.label || "Output Device"}</span>
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

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
