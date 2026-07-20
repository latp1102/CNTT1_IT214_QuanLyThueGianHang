import { createServer } from "http";
import { Server } from "socket.io";
import type express from "express";
import jwt from "jsonwebtoken";

let io: Server | null = null;

interface OnlineUser {
  userId: number;
  username: string;
  socketId: string;
}

const onlineUsers: Map<number, OnlineUser> = new Map();

export function emitToUserSockets(userId: number, event: string, data: any) {
  if (!io) return;
  const sockets = Array.from(io.sockets.sockets.values());
  for (const sock of sockets) {
    const sockUser = (sock as any).user;
    if (sockUser && sockUser.id === userId) {
      io.to(sock.id).emit(event, data);
    }
  }
}

export function initSocket(app: express.Application, port: number | string) {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_ACCESS_SECRET || "booth_rental_access_secret_key_123456") as any;
      (socket as any).user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        avatar: decoded.avatar,
        roles: decoded.roles
      };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`[Socket.IO] User connected: ${user.username} (${socket.id})`);

    onlineUsers.set(user.id, {
      userId: user.id,
      username: user.username,
      socketId: socket.id
    });

    io!.emit("online-users", Array.from(onlineUsers.values()));

    socket.on("video-call:offer", (data: { receiverId: number; offer: any; callId?: number }) => {
      const receiver = onlineUsers.get(data.receiverId);
      if (receiver) {
        emitToUserSockets(data.receiverId, "video-call:incoming", {
          callerId: user.id,
          callerName: user.username,
          callerAvatar: user.avatar,
          offer: data.offer,
          callId: data.callId
        });
      } else {
        socket.emit("video-call:user-offline", { receiverId: data.receiverId });
      }
    });

    socket.on("video-call:answer", (data: { callerId: number; answer: any; callId?: number }) => {
      emitToUserSockets(data.callerId, "video-call:answered", {
        answer: data.answer,
        callId: data.callId
      });
    });

    socket.on("video-call:ice-candidate", (data: { targetId: number; candidate: any }) => {
      emitToUserSockets(data.targetId, "video-call:ice-candidate", {
        candidate: data.candidate,
        fromId: user.id
      });
    });

    socket.on("video-call:end", (data: { targetId: number; callId?: number }) => {
      emitToUserSockets(data.targetId, "video-call:ended", {
        fromId: user.id,
        callId: data.callId
      });
    });

    socket.on("video-call:reject", (data: { callerId: number; callId?: number }) => {
      emitToUserSockets(data.callerId, "video-call:rejected", {
        fromId: user.id,
        fromName: user.username,
        callId: data.callId
      });
    });

    socket.on("video-call:sticker", (data: { targetId: number; emoji: string }) => {
      emitToUserSockets(data.targetId, "video-call:sticker", {
        emoji: data.emoji,
        fromName: user.username
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] User disconnected: ${user.username} (${socket.id})`);
      const hasOtherSockets = Array.from(io!.sockets.sockets.values()).some((s) => {
        if (s.id === socket.id) return false;
        const u = (s as any).user;
        return u && u.id === user.id;
      });
      if (!hasOtherSockets) {
        onlineUsers.delete(user.id);
      }
      io!.emit("online-users", Array.from(onlineUsers.values()));
    });
  });

  httpServer.listen(port, () => {
    console.log("===============================================");
    console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode`);
    console.log(`API URL: http://localhost:${port}/api`);
    console.log(`WebSocket: ws://localhost:${port}`);
    console.log("===============================================");
  });

  return httpServer;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO chưa được khởi tạo");
  return io;
}

export function getOnlineUsers() {
  return Array.from(onlineUsers.values());
}
