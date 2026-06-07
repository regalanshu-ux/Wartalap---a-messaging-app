import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
          if (process.env.NODE_ENV !== "production") {
            callback(null, true);
          } else {
            const allowed = ["http://localhost:5173", "http://localhost", "capacitor://localhost"];
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

// Used to store online users: { userId: socketId }
const userSocketMap = {};

export function getReceiverSocketId(receiverId) {
    return userSocketMap[receiverId];
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
        userSocketMap[userId] = socket.id;
    }

    // Broadcast the list of online user IDs to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        if (userId) {
            delete userSocketMap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    // Call signaling events
    socket.on("call-user", ({ userToCall, signalData, from, callType }) => {
        const receiverSocketId = getReceiverSocketId(userToCall);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("incoming-call", { signal: signalData, from, callType });
        }
    });

    socket.on("answer-call", ({ to, signal }) => {
        const callerSocketId = getReceiverSocketId(to);
        if (callerSocketId) {
            io.to(callerSocketId).emit("call-accepted", { signal });
        }
    });

    socket.on("reject-call", ({ to }) => {
        const callerSocketId = getReceiverSocketId(to);
        if (callerSocketId) {
            io.to(callerSocketId).emit("call-rejected");
        }
    });

    socket.on("end-call", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("call-ended");
        }
    });

    socket.on("send-ice-candidate", ({ to, candidate }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("ice-candidate", { candidate });
        }
    });

    socket.on("call-busy", ({ to }) => {
        const callerSocketId = getReceiverSocketId(to);
        if (callerSocketId) {
            io.to(callerSocketId).emit("call-busy");
        }
    });
});

export { io, app, server };
