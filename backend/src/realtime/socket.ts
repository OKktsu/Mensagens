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

  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error("Token nao informado."));
      }

      const payload = verifyAuthToken(token) as JwtPayload;

      if (!payload.sub || typeof payload.sub !== "string") {
        return next(new Error("Token invalido."));
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true },
      });

      if (!user) {
        return next(new Error("Usuario nao encontrado."));
      }

      socket.data.userId = user.id;
      socket.data.userName = user.name;

      return next();
    } catch {
      return next(new Error("Token invalido."));
    }
  });

  io.on("connection", (socket) => {
    // Coloca automaticamente a conexão na Sala Pessoal do usuário
    const personalRoom = `user:${socket.data.userId}`;
    socket.join(personalRoom);

    socket.emit("connection:ready", {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    // Indicador de digitação: início
    socket.on("typing:start", async (payload: { conversationId: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      const members = await prisma.conversationMember.findMany({
        where: {
          conversationId,
          userId: { not: socket.data.userId },
        },
        select: { userId: true },
      });

      members.forEach((member) => {
        io?.to(`user:${member.userId}`).emit("user:typing", {
          conversationId,
          userId: socket.data.userId,
          userName: socket.data.userName,
          isTyping: true,
        });
      });
    });

    // Indicador de digitação: parada
    socket.on("typing:stop", async (payload: { conversationId: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      const members = await prisma.conversationMember.findMany({
        where: {
          conversationId,
          userId: { not: socket.data.userId },
        },
        select: { userId: true },
      });

      members.forEach((member) => {
        io?.to(`user:${member.userId}`).emit("user:typing", {
          conversationId,
          userId: socket.data.userId,
          userName: socket.data.userName,
          isTyping: false,
        });
      });
    });

    // Compatibilidade opcional para salas legadas
    socket.on("conversation:join", async (conversationId: string, callback?: (response: { ok: boolean }) => void) => {
      await socket.join(getConversationRoom(conversationId));
      callback?.({ ok: true });
    });

    socket.on("conversation:leave", async (conversationId: string) => {
      await socket.leave(getConversationRoom(conversationId));
    });
  });
}

export async function emitMessageCreated(message: MessagePayload) {
  if (!io) return;

  // Busca todos os membros da conversa para disparar na sala pessoal de cada um
  const members = await prisma.conversationMember.findMany({
    where: { conversationId: message.conversationId },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("message:new", message);
  });
}

