import { prisma } from "../database/prisma.js";
import { emitMessageCreated } from "../realtime/socket.js";
import { AppError } from "../utils/app-error.js";

async function ensureConversationMember(conversationId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
  });

  if (!membership) {
    throw new AppError("Conversa nao encontrada.", 404);
  }
}

export async function listMessages(conversationId: string, userId: string) {
  await ensureConversationMember(conversationId, userId);

  return prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      conversationId: true,
      senderId: true,
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createMessage(conversationId: string, senderId: string, content: string) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new AppError("Mensagem nao pode ser vazia.");
  }

  await ensureConversationMember(conversationId, senderId);

  const message = await prisma.message.create({
    data: {
      content: trimmedContent,
      senderId,
      conversationId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      conversationId: true,
      senderId: true,
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  emitMessageCreated(message);

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return message;
}
