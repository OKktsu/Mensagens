import { ConversationRequestStatus } from "@prisma/client";

import { prisma } from "../database/prisma.js";
import {
  emitConversationRequestReceived,
  emitFriendshipCreated,
} from "../realtime/socket.js";
import { findOrCreateDirectConversation } from "./conversations.service.js";
import { AppError } from "../utils/app-error.js";

const requestDurationInDays = 7;

const requestSelection = {
  id: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  receiver: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} as const;

function getRequestExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + requestDurationInDays);
  return expirationDate;
}

async function expirePendingRequests() {
  await prisma.conversationRequest.updateMany({
    where: {
      status: ConversationRequestStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: ConversationRequestStatus.EXPIRED,
      resolvedAt: new Date(),
    },
  });
}

export async function createConversationRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    throw new AppError("Nao e possivel enviar um pedido para voce mesmo.");
  }

  await expirePendingRequests();

  const [receiver, friendship, pendingRequest] = await Promise.all([
    prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } }),
    prisma.friendship.findUnique({
      where: { userId_friendId: { userId: senderId, friendId: receiverId } },
    }),
    prisma.conversationRequest.findFirst({
      where: {
        status: ConversationRequestStatus.PENDING,
        expiresAt: { gt: new Date() },
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    }),
  ]);

  if (!receiver) {
    throw new AppError("Usuario nao encontrado.", 404);
  }

  if (friendship) {
    throw new AppError("Essa pessoa ja esta na sua lista de amigos.", 409);
  }

  if (pendingRequest) {
    throw new AppError("Ja existe um pedido pendente entre voces.", 409);
  }

  const conversationRequest = await prisma.conversationRequest.create({
    data: {
      senderId,
      receiverId,
      expiresAt: getRequestExpirationDate(),
    },
    select: requestSelection,
  });

  emitConversationRequestReceived(receiverId);

  return conversationRequest;
}

export async function listReceivedConversationRequests(receiverId: string) {
  await expirePendingRequests();

  return prisma.conversationRequest.findMany({
    where: {
      receiverId,
      status: ConversationRequestStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: requestSelection,
  });
}

export async function listSentConversationRequests(senderId: string) {
  await expirePendingRequests();

  return prisma.conversationRequest.findMany({
    where: {
      senderId,
      status: ConversationRequestStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: requestSelection,
  });
}

export async function acceptConversationRequest(requestId: string, receiverId: string) {
  await expirePendingRequests();

  const result = await prisma.$transaction(async (transaction) => {
    const conversationRequest = await transaction.conversationRequest.findFirst({
      where: {
        id: requestId,
        receiverId,
        status: ConversationRequestStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (!conversationRequest) {
      throw new AppError("Pedido pendente nao encontrado.", 404);
    }

    await transaction.conversationRequest.update({
      where: { id: conversationRequest.id },
      data: {
        status: ConversationRequestStatus.ACCEPTED,
        resolvedAt: new Date(),
      },
    });

    await transaction.friendship.createMany({
      data: [
        { userId: conversationRequest.senderId, friendId: conversationRequest.receiverId },
        { userId: conversationRequest.receiverId, friendId: conversationRequest.senderId },
      ],
      skipDuplicates: true,
    });

    const conversation = await findOrCreateDirectConversation(
      transaction,
      conversationRequest.receiverId,
      conversationRequest.senderId,
    );

    return {
      conversation,
      senderId: conversationRequest.senderId,
    };
  });

  emitFriendshipCreated(receiverId);
  emitFriendshipCreated(result.senderId);

  return result.conversation;
}

async function updatePendingRequest(
  requestId: string,
  userId: string,
  status: ConversationRequestStatus,
  ownershipField: "senderId" | "receiverId",
) {
  await expirePendingRequests();

  const result = await prisma.conversationRequest.updateMany({
    where: {
      id: requestId,
      [ownershipField]: userId,
      status: ConversationRequestStatus.PENDING,
    },
    data: {
      status,
      resolvedAt: new Date(),
    },
  });

  if (!result.count) {
    throw new AppError("Pedido pendente nao encontrado.", 404);
  }
}

export function rejectConversationRequest(requestId: string, receiverId: string) {
  return updatePendingRequest(requestId, receiverId, ConversationRequestStatus.REJECTED, "receiverId");
}

export function cancelConversationRequest(requestId: string, senderId: string) {
  return updatePendingRequest(requestId, senderId, ConversationRequestStatus.CANCELED, "senderId");
}