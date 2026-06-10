import { Server } from "socket.io";
import http from "http";
import express from "express";
import Call from "../models/call.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
          if (process.env.NODE_ENV !== "production") {
            callback(null, true);
          } else {
            const allowed = [
              "http://localhost:5173",
              "http://localhost",
              "capacitor://localhost",
              "https://wartalap.onrender.com",
              "http://wartalap.onrender.com"
            ];
            if (!origin || allowed.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          }
        },
        credentials: true
    }
});

// Used to store online users: { userId: Set<socketId> }
const userSocketMap = {};

// Active Call tracking map:
// Key: callId, Value: { callId, callerId, receiverId, callType, startTime, status }
const activeCalls = new Map();

async function saveCallLogAndEmit(call) {
    try {
        const duration = call.startTime ? Math.round((Date.now() - call.startTime) / 1000) : 0;
        const finalStatus = call.status === "accepted" ? "completed" : call.status;

        // Save Call document
        const callLog = new Call({
            callerId: call.callerId,
            receiverId: call.receiverId,
            callType: call.callType,
            status: finalStatus,
            duration: duration,
        });
        await callLog.save();

        let mins = Math.floor(duration / 60);
        let secs = duration % 60;
        let timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        let textText = `Call: ${call.callType} call ${finalStatus}${finalStatus === 'completed' ? ` (${timeStr})` : ''}`;

        // Save inline chat Message
        const callMessage = new Message({
            senderId: call.callerId,
            receiverId: call.receiverId,
            text: textText,
            messageType: "call",
            callDetails: {
                callType: call.callType,
                status: finalStatus,
                duration: duration,
            },
        });
        await callMessage.save();

        const sender = await User.findById(call.callerId).select("fullName");
        const emitData = {
            ...callMessage.toObject(),
            senderName: sender ? sender.fullName : "A friend",
        };

        // Emit call track message to both caller and receiver
        const allUserIds = [call.callerId.toString(), call.receiverId.toString()];
        allUserIds.forEach((uId) => {
            const sockets = getReceiverSocketIds(uId);
            sockets.forEach((sid) => {
                io.to(sid).emit("newMessage", emitData);
            });
        });
    } catch (err) {
        console.error("Error in saveCallLogAndEmit:", err);
    }
}

export function getReceiverSocketIds(receiverId) {
    return userSocketMap[receiverId] ? Array.from(userSocketMap[receiverId]) : [];
}

export function getReceiverSocketId(receiverId) {
    const ids = getReceiverSocketIds(receiverId);
    return ids.length > 0 ? ids[0] : null;
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);
    }

    // Broadcast the list of online user IDs to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);
            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
            }
        }

        // Clean up user's active call connections if any
        if (userId) {
            for (const [callId, call] of activeCalls.entries()) {
                if (call.callerId.toString() === userId.toString() || call.receiverId.toString() === userId.toString()) {
                    if (call.status === "accepted") {
                        call.status = "completed";
                    }
                    saveCallLogAndEmit(call);
                    activeCalls.delete(callId);
                    
                    const otherUser = call.callerId.toString() === userId.toString() ? call.receiverId : call.callerId;
                    const otherSockets = getReceiverSocketIds(otherUser);
                    otherSockets.forEach(sid => {
                        io.to(sid).emit("call-ended", { callId });
                    });
                }
            }
        }

        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    // Call signaling events
    socket.on("call-user", ({ userToCall, signalData, from, callType }) => {
        const callId = "call_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        activeCalls.set(callId, {
            callId,
            callerId: from._id,
            receiverId: userToCall,
            callType,
            startTime: null,
            status: "missed"
        });

        const receiverSocketIds = getReceiverSocketIds(userToCall);
        receiverSocketIds.forEach(socketId => {
            io.to(socketId).emit("incoming-call", { callId, signal: signalData, from, callType });
        });

        // Notify caller of the call session ID
        socket.emit("call-initiated", { callId });
    });

    socket.on("answer-call", ({ to, signal, callId }) => {
        let call;
        if (callId) {
            call = activeCalls.get(callId);
        } else {
            for (const c of activeCalls.values()) {
                if (c.callerId.toString() === to.toString() && c.receiverId.toString() === userId.toString()) {
                    call = c;
                    break;
                }
            }
        }

        if (call) {
            call.startTime = Date.now();
            call.status = "accepted";
        }

        const callerSocketIds = getReceiverSocketIds(to);
        callerSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-accepted", { callId: call?.callId, signal });
        });
    });

    socket.on("reject-call", ({ to, callId }) => {
        let call;
        if (callId) {
            call = activeCalls.get(callId);
        } else {
            for (const c of activeCalls.values()) {
                if (c.callerId.toString() === to.toString() && c.receiverId.toString() === userId.toString()) {
                    call = c;
                    break;
                }
            }
        }

        if (call) {
            call.status = "rejected";
            saveCallLogAndEmit(call);
            activeCalls.delete(call.callId);
        }

        const callerSocketIds = getReceiverSocketIds(to);
        callerSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-rejected", { callId: call?.callId });
        });
    });

    socket.on("end-call", ({ to, callId }) => {
        let call;
        if (callId) {
            call = activeCalls.get(callId);
        } else {
            for (const c of activeCalls.values()) {
                if ((c.callerId.toString() === userId.toString() && c.receiverId.toString() === to.toString()) ||
                    (c.callerId.toString() === to.toString() && c.receiverId.toString() === userId.toString())) {
                    call = c;
                    break;
                }
            }
        }

        if (call) {
            if (call.status === "accepted") {
                call.status = "completed";
            }
            saveCallLogAndEmit(call);
            activeCalls.delete(call.callId);

            const receiverSocketIds = getReceiverSocketIds(to);
            receiverSocketIds.forEach(socketId => {
                io.to(socketId).emit("call-ended", { callId: call.callId });
            });
        } else {
            const receiverSocketIds = getReceiverSocketIds(to);
            receiverSocketIds.forEach(socketId => {
                io.to(socketId).emit("call-ended");
            });
        }
    });

    socket.on("send-ice-candidate", ({ to, candidate }) => {
        const receiverSocketIds = getReceiverSocketIds(to);
        receiverSocketIds.forEach(socketId => {
            io.to(socketId).emit("ice-candidate", { candidate });
        });
    });

    socket.on("call-busy", ({ to }) => {
        const callerSocketIds = getReceiverSocketIds(to);
        callerSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-busy");
        });
    });
});

export { io, app, server };
