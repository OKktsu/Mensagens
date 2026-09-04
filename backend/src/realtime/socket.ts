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
const connectedUsers = new Map<string, Set<string>>();

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
    const userId = socket.data.userId as string;

    // Coloca automaticamente a conexão na Sala Pessoal do usuário
    const personalRoom = `user:${userId}`;
    socket.join(personalRoom);

    // Gerencia status online
    const userSockets = connectedUsers.get(userId) ?? new Set<string>();
    const isFirstConnection = userSockets.size === 0;
    userSockets.add(socket.id);
    connectedUsers.set(userId, userSockets);

    if (isFirstConnection) {
      io?.emit("user:status", {
        userId,
        isOnline: true,
      });
    }

    socket.emit("connection:ready", {
      socketId: socket.id,
      userId,
      onlineUserIds: Array.from(connectedUsers.keys()),
    });

    // Indicador de digitação: início
    socket.on("typing:start", async (payload: { conversationId: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      const members = await prisma.conversationMember.findMany({
        where: {
          conversationId,
          userId: { not: userId },
        },
        select: { userId: true },
      });

      members.forEach((member) => {
        io?.to(`user:${member.userId}`).emit("user:typing", {
          conversationId,
          userId,
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
          userId: { not: userId },
        },
        select: { userId: true },
      });

      members.forEach((member) => {
        io?.to(`user:${member.userId}`).emit("user:typing", {
          conversationId,
          userId,
          userName: socket.data.userName,
          isTyping: false,
        });
      });
    });

    // Sinalização WebRTC: Convite para chamada
    socket.on("call:invite", (payload: { toUserId: string; conversationId: string; offer: unknown }) => {
      if (!payload?.toUserId || !payload?.offer) return;

      io?.to(`user:${payload.toUserId}`).emit("call:incoming", {
        fromUserId: userId,
        fromUserName: socket.data.userName,
        conversationId: payload.conversationId,
        offer: payload.offer,
      });
    });

    // Sinalização WebRTC: Resposta à chamada
    socket.on("call:answer", (payload: { toUserId: string; conversationId: string; answer: unknown }) => {
      if (!payload?.toUserId || !payload?.answer) return;

      io?.to(`user:${payload.toUserId}`).emit("call:answered", {
        fromUserId: userId,
        conversationId: payload.conversationId,
        answer: payload.answer,
      });
    });

    // Sinalização WebRTC: Candidatos ICE de rede
    socket.on("call:ice-candidate", (payload: { toUserId: string; candidate: unknown }) => {
      if (!payload?.toUserId || !payload?.candidate) return;

      io?.to(`user:${payload.toUserId}`).emit("call:ice-candidate", {
        fromUserId: userId,
        candidate: payload.candidate,
      });
    });

    // Sinalização WebRTC: Rejeição de chamada
    socket.on("call:reject", (payload: { toUserId: string; conversationId?: string }) => {
      if (!payload?.toUserId) return;

      io?.to(`user:${payload.toUserId}`).emit("call:rejected", {
        fromUserId: userId,
        conversationId: payload.conversationId,
      });
    });

    // Sinalização WebRTC: Encerramento de chamada
    socket.on("call:end", (payload: { toUserId: string; conversationId?: string }) => {
      if (!payload?.toUserId) return;

      io?.to(`user:${payload.toUserId}`).emit("call:ended", {
        fromUserId: userId,
        conversationId: payload.conversationId,
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


    // Ao desconectar
    socket.on("disconnect", () => {
      const sockets = connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedUsers.delete(userId);
          io?.emit("user:status", {
            userId,
            isOnline: false,
          });
        }
      }
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

export async function emitConversationRead(conversationId: string, readerUserId: string, readAt: Date) {
  if (!io) return;

  const members = await prisma.conversationMember.findMany({
    where: {
      conversationId,
      userId: { not: readerUserId },
    },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("conversation:read", {
      conversationId,
      userId: readerUserId,
      readAt,
    });
  });
}


