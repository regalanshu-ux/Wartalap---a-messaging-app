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
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    // Call signaling events
    socket.on("call-user", ({ userToCall, signalData, from, callType }) => {
        const receiverSocketIds = getReceiverSocketIds(userToCall);
        receiverSocketIds.forEach(socketId => {
            io.to(socketId).emit("incoming-call", { signal: signalData, from, callType });
        });
    });

    socket.on("answer-call", ({ to, signal }) => {
        const callerSocketIds = getReceiverSocketIds(to);
        callerSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-accepted", { signal });
        });
    });

    socket.on("reject-call", ({ to }) => {
        const callerSocketIds = getReceiverSocketIds(to);
        callerSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-rejected");
        });
    });

    socket.on("end-call", ({ to }) => {
        const receiverSocketIds = getReceiverSocketIds(to);
        receiverSocketIds.forEach(socketId => {
            io.to(socketId).emit("call-ended");
        });
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
