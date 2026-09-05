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
      type: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      duration: true,
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

type CreateMessageInput = {
  content?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
};

export async function createMessage(
  conversationId: string,
  senderId: string,
  input: string | CreateMessageInput,
) {
  const isString = typeof input === "string";
  const content = (isString ? input : input.content ?? "").trim();
  const fileUrl = isString ? undefined : input.fileUrl;
  const type = isString ? "text" : input.type ?? (fileUrl ? "file" : "text");
  const fileName = isString ? undefined : input.fileName;
  const fileSize = isString ? undefined : input.fileSize;
  const duration = isString ? undefined : input.duration;

  if (!content && !fileUrl) {
    throw new AppError("Mensagem ou anexo obrigatorio.");
  }

  await ensureConversationMember(conversationId, senderId);

  const message = await prisma.message.create({
    data: {
      content,
      type,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      fileSize: fileSize ? Math.floor(fileSize) : null,
      duration: duration ? Math.floor(duration) : null,
      senderId,
      conversationId,
    },
    select: {
      id: true,
      content: true,
      type: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      duration: true,
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

