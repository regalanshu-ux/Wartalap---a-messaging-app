import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

let peerConnection = null;
let localStream = null;
let queuedCandidates = [];

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStream = stream;
      set({ localStream: stream });

      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
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
      await peerConnection.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCall: callee._id,
        signalData: offer,
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStream = stream;
      set({ localStream: stream, callState: "active" });

      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
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
      await peerConnection.setLocalDescription(answer);

      socket.emit("answer-call", {
        to: caller._id,
        signal: answer,
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
