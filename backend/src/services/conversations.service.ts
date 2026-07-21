import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
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
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
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
      createdAt: true,
      updatedAt: true,
    },
  });
}
