import type { Server, Socket } from "socket.io";
import type { JwtPayload } from "jsonwebtoken";

import { prisma } from "../database/prisma.js";
import { verifyAuthToken } from "../utils/auth-token.js";

export type MessagePayload = {
  id: string;
  content: string;
  type?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  isForwarded?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    type?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    user?: {
      id: string;
      name: string;
    };
  }>;
  starredBy?: Array<{
    userId: string;
  }>;
  expiresAt?: Date | string | null;
  ttl?: number | null;
  createdAt: Date;
  updatedAt?: Date;
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

type GroupCallParticipant = {
  socketId: string;
  userId: string;
  userName: string;
};

type ActiveGroupCall = {
  conversationId: string;
  initiatorId: string;
  initiatorName: string;
  callType: "audio" | "video";
  startedAt: Date;
  participants: Map<string, GroupCallParticipant>;
};

const activeGroupCalls = new Map<string, ActiveGroupCall>();

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

    // Sinalização WebRTC: Convite para chamada (Voz ou Vídeo)
    socket.on("call:invite", (payload: { toUserId: string; conversationId: string; offer: unknown; callType?: "audio" | "video" }) => {
      if (!payload?.toUserId || !payload?.offer) return;

      io?.to(`user:${payload.toUserId}`).emit("call:incoming", {
        fromUserId: userId,
        fromUserName: socket.data.userName,
        conversationId: payload.conversationId,
        offer: payload.offer,
        callType: payload.callType ?? "audio",
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

    // Sinalização WebRTC: Encerramento de chamada 1-para-1
    socket.on("call:end", (payload: { toUserId: string; conversationId?: string }) => {
      if (!payload?.toUserId) return;

      io?.to(`user:${payload.toUserId}`).emit("call:ended", {
        fromUserId: userId,
        conversationId: payload.conversationId,
      });
    });

    // ==========================================================================
    // SINALIZAÇÃO WEBRTC: CHAMADAS EM GRUPO (Mesh)
    // ==========================================================================

    const handleUserLeaveGroupCall = (conversationId: string) => {
      const call = activeGroupCalls.get(conversationId);
      if (!call) return;

      call.participants.delete(userId);
      socket.leave(`group-call:${conversationId}`);

      socket.to(`group-call:${conversationId}`).emit("group-call:user-left", {
        conversationId,
        userId,
        userName: socket.data.userName,
      });

      if (call.participants.size === 0) {
        activeGroupCalls.delete(conversationId);
        io?.to(getConversationRoom(conversationId)).emit("group-call:status", {
          conversationId,
          isActive: false,
          participantCount: 0,
        });
      } else {
        io?.to(getConversationRoom(conversationId)).emit("group-call:status", {
          conversationId,
          isActive: true,
          callType: call.callType,
          initiatorName: call.initiatorName,
          participantCount: call.participants.size,
        });
      }
    };

    socket.on("group-call:join", (payload: { conversationId: string; callType?: "audio" | "video" }) => {
      if (!payload?.conversationId) return;

      const callType = payload.callType ?? "video";
      let call = activeGroupCalls.get(payload.conversationId);

      if (!call) {
        call = {
          conversationId: payload.conversationId,
          initiatorId: userId,
          initiatorName: socket.data.userName,
          callType,
          startedAt: new Date(),
          participants: new Map(),
        };
        activeGroupCalls.set(payload.conversationId, call);
      }

      call.participants.set(userId, {
        socketId: socket.id,
        userId,
        userName: socket.data.userName,
      });

      socket.join(`group-call:${payload.conversationId}`);

      // Lista de participantes já existentes
      const existingParticipants = Array.from(call.participants.values())
        .filter((p) => p.userId !== userId)
        .map((p) => ({ userId: p.userId, userName: p.userName }));

      socket.emit("group-call:joined", {
        conversationId: payload.conversationId,
        callType: call.callType,
        participants: existingParticipants,
      });

      socket.to(`group-call:${payload.conversationId}`).emit("group-call:user-joined", {
        conversationId: payload.conversationId,
        userId,
        userName: socket.data.userName,
        callType: call.callType,
      });

      io?.to(getConversationRoom(payload.conversationId)).emit("group-call:status", {
        conversationId: payload.conversationId,
        isActive: true,
        callType: call.callType,
        initiatorName: call.initiatorName,
        participantCount: call.participants.size,
      });
    });

    socket.on("group-call:signal", (payload: {
      conversationId: string;
      toUserId: string;
      signal: unknown;
    }) => {
      if (!payload?.toUserId || !payload?.signal) return;

      io?.to(`user:${payload.toUserId}`).emit("group-call:signal", {
        conversationId: payload.conversationId,
        fromUserId: userId,
        fromUserName: socket.data.userName,
        signal: payload.signal,
      });
    });

    socket.on("group-call:leave", (payload: { conversationId: string }) => {
      if (payload?.conversationId) {
        handleUserLeaveGroupCall(payload.conversationId);
      }
    });

    socket.on("group-call:get-status", (payload: { conversationId: string }, callback?: (status: unknown) => void) => {
      if (!payload?.conversationId) return;
      const call = activeGroupCalls.get(payload.conversationId);
      if (call && call.participants.size > 0) {
        callback?.({
          isActive: true,
          callType: call.callType,
          initiatorName: call.initiatorName,
          participantCount: call.participants.size,
        });
      } else {
        callback?.({
          isActive: false,
          participantCount: 0,
        });
      }
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
      // Limpa chamadas de grupo em que o usuário estava
      for (const [convId, call] of activeGroupCalls.entries()) {
        if (call.participants.has(userId)) {
          handleUserLeaveGroupCall(convId);
        }
      }

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

export async function emitMessageUpdated(message: MessagePayload) {
  if (!io) return;

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: message.conversationId },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("message:updated", message);
  });
}

export async function emitMessageDeleted(payload: { conversationId: string; messageId: string }) {
  if (!io) return;

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: payload.conversationId },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("message:deleted", payload);
  });
}

export async function emitMessageReaction(payload: {
  conversationId: string;
  messageId: string;
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    user?: {
      id: string;
      name: string;
    };
  }>;
}) {
  if (!io) return;

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: payload.conversationId },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("message:reaction", payload);
  });
}

export async function emitConversationPinned(payload: {
  conversationId: string;
  pinnedMessageId: string | null;
  pinnedMessage?: unknown;
}) {
  if (!io) return;

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: payload.conversationId },
    select: { userId: true },
  });

  members.forEach((member) => {
    io?.to(`user:${member.userId}`).emit("conversation:pinned", payload);
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

export function emitUserProfileUpdated(user: unknown) {
  if (!io) return;
  io.emit("user:profile_updated", user);
}

export function emitConversationRequestReceived(receiverId: string) {
  io?.to("user:" + receiverId).emit("conversation-request:received");
}

export function emitFriendshipCreated(userId: string) {
  io?.to("user:" + userId).emit("friendship:created");
}