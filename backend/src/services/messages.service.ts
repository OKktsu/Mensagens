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
import {
  scheduleMessageExpiration,
  cancelMessageExpiration,
} from "./ttl-scheduler.service.js";

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
  expiresAt: true,
  ttl: true,
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

export type ListMessagesOptions = {
  limit?: number;
  before?: string;
};

export async function listMessages(
  conversationId: string,
  userId: string,
  options: ListMessagesOptions = {},
) {
  await ensureConversationMember(conversationId, userId);

  const limit = options.limit ? Math.min(Math.max(Number(options.limit), 1), 100) : 25;
  const now = new Date();
  const whereClause: {
    conversationId: string;
    createdAt?: { lt: Date };
    OR?: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
  } = {
    conversationId,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  };

  if (options.before) {
    const referenceMessage = await prisma.message.findUnique({
      where: { id: options.before },
      select: { createdAt: true },
    });

    if (referenceMessage) {
      whereClause.createdAt = {
        lt: referenceMessage.createdAt,
      };
    }
  }

  // Busca limit + 1 em ordem decrescente para saber se há mais mensagens anteriores
  const rawMessages = await prisma.message.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc",
    },
    take: limit + 1,
    select: messageSelect,
  });

  const hasMore = rawMessages.length > limit;
  const pageMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Reordena para ordem cronológica (asc) para renderização no chat
  const chronological = pageMessages.reverse();
  const enriched = await Promise.all(chronological.map((m) => enrichMessageWithSignedUrls(m)));

  return {
    messages: enriched,
    hasMore,
    nextCursor: hasMore && enriched.length > 0 ? enriched[0].id : null,
  };
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
  ttl?: number;
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
  const ttl = !isString && input.ttl ? Math.floor(Number(input.ttl)) : undefined;
  const expiresAt = ttl && ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;

  if (!content && !fileUrl) {
    throw new AppError("Mensagem ou anexo obrigatorio.");
  }

  await ensureConversationMember(conversationId, senderId);

  let storedFileUrl = fileUrl ?? null;
  if (storedFileUrl) {
    const supabaseMatch = storedFileUrl.match(
      /(?:chat-uploads|\/storage\/v1\/object\/(?:sign|public)\/[^/]+)\/(.+?)(?:\?|$)/,
    );
    if (supabaseMatch && supabaseMatch[1]) {
      storedFileUrl = decodeURIComponent(supabaseMatch[1]);
    } else if (!storedFileUrl.startsWith("http://") && !storedFileUrl.startsWith("https://")) {
      storedFileUrl = storedFileUrl
        .replace(/^\/uploads\//, "")
        .replace(/^chat-uploads\//, "")
        .split("?")[0];
    }
  }

  const message = await prisma.message.create({
    data: {
      content,
      type,
      fileUrl: storedFileUrl,
      fileName: fileName ?? null,
      fileSize: fileSize ? Math.floor(fileSize) : null,
      duration: duration ? Math.floor(duration) : null,
      replyToId: replyToId ?? null,
      isForwarded,
      ttl: ttl && ttl > 0 ? ttl : null,
      expiresAt,
      senderId,
      conversationId,
    },
    select: messageSelect,
  });

  // Se houver data de expiração, agenda a autodestruição no milissegundo exato
  if (message.expiresAt) {
    scheduleMessageExpiration(message.id, message.expiresAt, message.conversationId);
  }

  const enrichedMessage = await enrichMessageWithSignedUrls(message);

  emitMessageCreated(enrichedMessage);

  // Atualiza updatedAt da conversa em background sem bloquear o retorno imediato da API
  prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    },
  }).catch((err) => {
    console.error("[Messages Service] Erro ao atualizar timestamp da conversa:", err);
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

  // Cancela agendamento de autodestruição se houver
  cancelMessageExpiration(messageId);

  // Soft delete: limpa mídias e marca isDeleted como true
  const deletedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: "Esta mensagem foi apagada",
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


