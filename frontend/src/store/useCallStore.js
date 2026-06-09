import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

let peerConnection = null;
let localStream = null;
let queuedCandidates = [];

// Helper to optimize SDP for low bandwidth (e.g., 2G connections)
const optimizeSdp = (sdp) => {
  if (!sdp) return sdp;
  
  // 1. Optimize Audio parameters (limit bitrate to 16kbps, enable DTX)
  let modifiedSdp = sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
    if (params.includes("useinbandfec")) {
      let updatedParams = params;
      if (!params.includes("maxaveragebitrate")) {
        updatedParams += ";maxaveragebitrate=16000"; // Limit to 16 kbps (perfect for 2G)
      }
      if (!params.includes("usedtx")) {
        updatedParams += ";usedtx=1"; // Enable Discontinuous Transmission (saves bandwidth during silence)
      }
      return `a=fmtp:${pt} ${updatedParams}`;
    }
    return match;
  });

  // 2. Optimize Video parameters (limit video bitrate to 80kbps for 2G)
  if (modifiedSdp.includes("m=video")) {
    modifiedSdp = modifiedSdp.replace(/(m=video.*\r?\n)/, "$1b=AS:80\r\n");
  }

  return modifiedSdp;
};

export const useCallStore = create((set, get) => ({
  callState: "idle", // "idle", "dialing", "incoming", "active"
  callType: null, // "voice", "video"
  caller: null,
  callee: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  incomingSignal: null,

  initCallListeners: (socket) => {
    if (!socket) return;

    socket.off("incoming-call");
    socket.off("call-accepted");
    socket.off("call-rejected");
    socket.off("call-ended");
    socket.off("ice-candidate");
    socket.off("call-busy");

    socket.on("incoming-call", ({ signal, from, callType }) => {
      const currentCallState = get().callState;
      if (currentCallState !== "idle") {
        socket.emit("call-busy", { to: from._id });
        return;
      }

      set({
        callState: "incoming",
        callType,
        caller: from,
        callee: useAuthStore.getState().authUser,
        incomingSignal: signal,
      });
    });

    socket.on("call-accepted", async ({ signal }) => {
      const state = get();
      if (state.callState !== "dialing" || !peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        set({ callState: "active" });

        // Apply queued candidates
        for (const candidate of queuedCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add queued ICE candidate:", err);
          }
        }
        queuedCandidates = [];
      } catch (err) {
        console.error("Error setting remote description:", err);
        get().endCall();
      }
    });

    socket.on("call-rejected", () => {
      toast.error("Call declined");
      get().resetCallState();
    });

    socket.on("call-busy", () => {
      toast.error("User is currently on another call");
      get().resetCallState();
    });

    socket.on("call-ended", () => {
      toast("Call ended");
      get().resetCallState();
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      } else {
        queuedCandidates.push(candidate);
      }
    });
  },

  initiateCall: async (callee, callType) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      toast.error("Signaling connection unavailable");
      return;
    }

    set({
      callState: "dialing",
      callType,
      caller: useAuthStore.getState().authUser,
      callee,
    });

    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 8, max: 12 }
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream = stream;
      set({ localStream: stream });

      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:openrelay.metered.ca:80" },
          {
            urls: [
              "turn:openrelay.metered.ca:80?transport=udp",
              "turn:openrelay.metered.ca:443?transport=tcp",
              "turns:openrelay.metered.ca:443?transport=tcp"
            ],
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ],
      });

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("send-ice-candidate", {
            to: callee._id,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      const offer = await peerConnection.createOffer();
      const optimizedSdp = optimizeSdp(offer.sdp);
      const optimizedOffer = new RTCSessionDescription({
        type: offer.type,
        sdp: optimizedSdp,
      });
      await peerConnection.setLocalDescription(optimizedOffer);

      socket.emit("call-user", {
        userToCall: callee._id,
        signalData: optimizedOffer,
        from: useAuthStore.getState().authUser,
        callType,
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      toast.error("Could not access camera/microphone");
      get().resetCallState();
    }
  },

  answerCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { incomingSignal, caller, callType } = get();
    if (!socket || !caller || !incomingSignal) return;

    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 8, max: 12 }
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream = stream;
      set({ localStream: stream, callState: "active" });

      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:openrelay.metered.ca:80" },
          {
            urls: [
              "turn:openrelay.metered.ca:80?transport=udp",
              "turn:openrelay.metered.ca:443?transport=tcp",
              "turns:openrelay.metered.ca:443?transport=tcp"
            ],
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ],
      });

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("send-ice-candidate", {
            to: caller._id,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingSignal));

      for (const candidate of queuedCandidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to add queued ICE candidate:", err);
        }
      }
      queuedCandidates = [];

      const answer = await peerConnection.createAnswer();
      const optimizedSdp = optimizeSdp(answer.sdp);
      const optimizedAnswer = new RTCSessionDescription({
        type: answer.type,
        sdp: optimizedSdp,
      });
      await peerConnection.setLocalDescription(optimizedAnswer);

      socket.emit("answer-call", {
        to: caller._id,
        signal: optimizedAnswer,
      });
    } catch (err) {
      console.error("Failed to answer call:", err);
      toast.error("Could not access camera/microphone");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const socket = useAuthStore.getState().socket;
    const { caller } = get();
    if (socket && caller) {
      socket.emit("reject-call", { to: caller._id });
    }
    get().resetCallState();
  },

  endCall: () => {
    const socket = useAuthStore.getState().socket;
    const { caller, callee } = get();
    const otherUser = caller?._id === useAuthStore.getState().authUser?._id ? callee : caller;

    if (socket && otherUser) {
      socket.emit("end-call", { to: otherUser._id });
    }
    get().resetCallState();
  },

  toggleMute: () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        set({ isMuted: !audioTrack.enabled });
      }
    }
  },

  toggleCamera: () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        set({ isCameraOff: !videoTrack.enabled });
      }
    }
  },

  resetCallState: () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    queuedCandidates = [];
    set({
      callState: "idle",
      callType: null,
      caller: null,
      callee: null,
      localStream: null,
      remoteStream: null,
      incomingSignal: null,
      isMuted: false,
      isCameraOff: false,
    });
  },
}));
