import type { Server, Socket } from "socket.io";
import type { JwtPayload } from "jsonwebtoken";

import { prisma } from "../database/prisma.js";
import { verifyAuthToken } from "../utils/auth-token.js";

type MessagePayload = {
  id: string;
  content: string;
  createdAt: Date;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
};
 
let io: Server | null = null;

function getConversationRoom(conversationId: string) {
  return `conversation:${conversationId}`;
}

function getSocketToken(socket: Socket) {
  const token = socket.handshake.auth.token;

  return typeof token === "string" ? token : null;
}

export function setupSocketServer(socketServer: Server) {
  io = socketServer;

  io.use((socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error("Token nao informado."));
      }

      const payload = verifyAuthToken(token) as JwtPayload;

      if (!payload.sub || typeof payload.sub !== "string") {
        return next(new Error("Token invalido."));
      }

      socket.data.userId = payload.sub;

      return next();
    } catch {
      return next(new Error("Token invalido."));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connection:ready", {
      socketId: socket.id,
    });

    socket.on("conversation:join", async (conversationId: string, callback?: (response: { ok: boolean }) => void) => {
      const membership = await prisma.conversationMember.findUnique({
        where: {
          userId_conversationId: {
            userId: socket.data.userId,
            conversationId,
          },
        },
      });

      if (!membership) {
        callback?.({ ok: false });
        return;
      }

      await socket.join(getConversationRoom(conversationId));
      callback?.({ ok: true });
    });

    socket.on("conversation:leave", async (conversationId: string) => {
      await socket.leave(getConversationRoom(conversationId));
    });
  });
}

export function emitMessageCreated(message: MessagePayload) {
  io?.to(getConversationRoom(message.conversationId)).emit("message:new", message);
}
