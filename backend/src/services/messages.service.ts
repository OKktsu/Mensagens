import { prisma } from "../database/prisma.js";
import {
  emitConversationPinned,
  emitMessageCreated,
  emitMessageDeleted,
  emitMessageReaction,
  emitMessageUpdated,
} from "../realtime/socket.js";
import { createSignedMediaUrl } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

const messageSelect = {
  id: true,
  content: true,
  type: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  duration: true,
  isForwarded: true,
  isEdited: true,
  isDeleted: true,
  replyToId: true,
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      fileUrl: true,
      fileName: true,
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  starredBy: {
    select: {
      userId: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  conversationId: true,
  senderId: true,
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

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

async function enrichMessageWithSignedUrls<
  T extends { fileUrl?: string | null; replyTo?: { fileUrl?: string | null } | null },
>(message: T): Promise<T> {
  if (!message) return message;
  let fileUrl = message.fileUrl;
  if (
    fileUrl &&
    !fileUrl.startsWith("http://") &&
    !fileUrl.startsWith("https://") &&
    !fileUrl.startsWith("blob:")
  ) {
    fileUrl = await createSignedMediaUrl(fileUrl, 7200);
  }

  let replyTo = message.replyTo;
  if (
    replyTo &&
    replyTo.fileUrl &&
    !replyTo.fileUrl.startsWith("http://") &&
    !replyTo.fileUrl.startsWith("https://") &&
    !replyTo.fileUrl.startsWith("blob:")
  ) {
    replyTo = {
      ...replyTo,
      fileUrl: await createSignedMediaUrl(replyTo.fileUrl, 7200),
    };
  }

  return {
    ...message,
    fileUrl,
    replyTo,
  };
}

export async function listMessages(conversationId: string, userId: string) {
  await ensureConversationMember(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: messageSelect,
  });

  return Promise.all(messages.map((m) => enrichMessageWithSignedUrls(m)));
}

type CreateMessageInput = {
  content?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  replyToId?: string;
  isForwarded?: boolean;
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
  const replyToId = isString ? undefined : input.replyToId;
  const isForwarded = isString ? false : Boolean(input.isForwarded);

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
      replyToId: replyToId ?? null,
      isForwarded,
      senderId,
      conversationId,
    },
    select: messageSelect,
  });

  const enrichedMessage = await enrichMessageWithSignedUrls(message);

  emitMessageCreated(enrichedMessage);

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return enrichedMessage;
}

export async function updateMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  newContent: string,
) {
  await ensureConversationMember(conversationId, userId);

  const existingMessage = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!existingMessage || existingMessage.conversationId !== conversationId) {
    throw new AppError("Mensagem nao encontrada.", 404);
  }

  if (existingMessage.senderId !== userId) {
    throw new AppError("Apenas o autor pode editar a mensagem.", 403);
  }

  if (existingMessage.isDeleted) {
    throw new AppError("Nao e possivel editar uma mensagem apagada.", 400);
  }

  const trimmed = newContent.trim();
  if (!trimmed) {
    throw new AppError("O conteudo da mensagem nao pode ser vazio.", 400);
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: trimmed,
      isEdited: true,
      updatedAt: new Date(),
    },
    select: messageSelect,
  });

  emitMessageUpdated(updatedMessage);

  return updatedMessage;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  await ensureConversationMember(conversationId, userId);

  const existingMessage = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!existingMessage || existingMessage.conversationId !== conversationId) {
    throw new AppError("Mensagem nao encontrada.", 404);
  }

  if (existingMessage.senderId !== userId) {
    throw new AppError("Apenas o autor pode apagar a mensagem.", 403);
  }

  // Soft delete: limpa mídias e marca isDeleted como true
  const deletedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: "🚫 Esta mensagem foi apagada",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      duration: null,
      isDeleted: true,
      updatedAt: new Date(),
    },
    select: messageSelect,
  });

  emitMessageDeleted({ conversationId, messageId });

  return deletedMessage;
}

export async function toggleReaction(
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string,
) {
  await ensureConversationMember(conversationId, userId);

  const existingReaction = await prisma.messageReaction.findUnique({
    where: {
      userId_messageId_emoji: {
        userId,
        messageId,
        emoji,
      },
    },
  });

  if (existingReaction) {
    // Remove reação existente
    await prisma.messageReaction.delete({
      where: { id: existingReaction.id },
    });
  } else {
    // Adiciona nova reação
    await prisma.messageReaction.create({
      data: {
        emoji,
        userId,
        messageId,
      },
    });
  }

  const allReactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: {
      id: true,
      emoji: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  emitMessageReaction({
    conversationId,
    messageId,
    reactions: allReactions,
  });

  return allReactions;
}

export async function toggleStarMessage(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  await ensureConversationMember(conversationId, userId);

  const existingStar = await prisma.starredMessage.findUnique({
    where: {
      userId_messageId: {
        userId,
        messageId,
      },
    },
  });

  if (existingStar) {
    await prisma.starredMessage.delete({
      where: { id: existingStar.id },
    });
    return { isStarred: false };
  } else {
    await prisma.starredMessage.create({
      data: {
        userId,
        messageId,
      },
    });
    return { isStarred: true };
  }
}

export async function pinMessage(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  await ensureConversationMember(conversationId, userId);

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      type: true,
      fileName: true,
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!message) {
    throw new AppError("Mensagem nao encontrada.", 404);
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      pinnedMessageId: messageId,
    },
  });

  emitConversationPinned({
    conversationId,
    pinnedMessageId: messageId,
    pinnedMessage: message,
  });

  return { ok: true, pinnedMessage: message };
}

export async function unpinMessage(conversationId: string, userId: string) {
  await ensureConversationMember(conversationId, userId);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      pinnedMessageId: null,
    },
  });

  emitConversationPinned({
    conversationId,
    pinnedMessageId: null,
    pinnedMessage: null,
  });

  return { ok: true };
}


