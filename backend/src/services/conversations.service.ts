import { prisma } from "../database/prisma.js";
import { emitConversationRead } from "../realtime/socket.js";
import { AppError } from "../utils/app-error.js";

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          userId: true,
          lastReadAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const myMembership = conversation.members.find((m) => m.userId === userId);
      const lastReadAt = myMembership?.lastReadAt ?? new Date(0);

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          createdAt: { gt: lastReadAt },
        },
      });

      return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        unreadCount,
        members: conversation.members.map((m) => ({
          userId: m.userId,
          lastReadAt: m.lastReadAt,
          user: m.user,
        })),
        messages: conversation.messages,
      };
    }),
  );

  return conversationsWithUnread;
}

export async function markConversationAsRead(userId: string, conversationId: string) {
  const readAt = new Date();

  await prisma.conversationMember.updateMany({
    where: {
      userId,
      conversationId,
    },
    data: {
      lastReadAt: readAt,
    },
  });

  emitConversationRead(conversationId, userId, readAt);

  return { ok: true };
}



export async function createConversation(currentUserId: string, participantId: string) {
  if (currentUserId === participantId) {
    throw new AppError("Nao e possivel criar uma conversa com voce mesmo.");
  }

  const participant = await prisma.user.findUnique({
    where: {
      id: participantId,
    },
  });

  if (!participant) {
    throw new AppError("Usuario participante nao encontrado.", 404);
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        {
          members: {
            some: {
              userId: currentUserId,
            },
          },
        },
        {
          members: {
            some: {
              userId: participantId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingConversation) {
    return existingConversation;
  }

  return prisma.conversation.create({
    data: {
      members: {
        create: [
          {
            userId: currentUserId,
          },
          {
            userId: participantId,
          },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createGroupConversation(
  currentUserId: string,
  participantIds: string[],
  title?: string,
) {
  // Remove duplicados e o próprio usuário se foi passado na lista
  const uniqueParticipantIds = Array.from(
    new Set(participantIds.filter((id) => id && id !== currentUserId)),
  );

  if (uniqueParticipantIds.length < 1) {
    throw new AppError("Um grupo precisa ter pelo menos 1 outro participante.");
  }

  // Valida que todos os participantes existem
  const foundUsers = await prisma.user.findMany({
    where: {
      id: {
        in: uniqueParticipantIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (foundUsers.length !== uniqueParticipantIds.length) {
    throw new AppError("Um ou mais participantes nao foram encontrados.", 404);
  }

  const allMemberIds = [currentUserId, ...uniqueParticipantIds];

  const trimmedTitle = title?.trim() || null;

  return prisma.conversation.create({
    data: {
      title: trimmedTitle,
      members: {
        create: allMemberIds.map((userId) => ({
          userId,
        })),
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

