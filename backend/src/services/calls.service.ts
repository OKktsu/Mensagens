import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";

type CreateCallInput = {
  receiverId: string;
  conversationId?: string;
  type: "audio" | "video";
  status: "completed" | "missed" | "rejected";
  duration: number;
  startedAt?: Date | string;
  endedAt?: Date | string;
};

export async function createCall(callerId: string, input: CreateCallInput) {
  if (!input.receiverId) {
    throw new AppError("Destinatario da chamada nao informado.");
  }

  const receiver = await prisma.user.findUnique({
    where: { id: input.receiverId },
  });

  if (!receiver) {
    throw new AppError("Destinatario nao encontrado.");
  }

  const call = await prisma.call.create({
    data: {
      callerId,
      receiverId: input.receiverId,
      conversationId: input.conversationId ?? null,
      type: input.type === "video" ? "video" : "audio",
      status: input.status,
      duration: Math.max(0, Math.floor(input.duration || 0)),
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      endedAt: input.endedAt ? new Date(input.endedAt) : new Date(),
    },
    include: {
      caller: {
        select: { id: true, name: true, email: true },
      },
      receiver: {
        select: { id: true, name: true, email: true },
      },
      conversation: {
        select: { id: true, title: true },
      },
    },
  });

  return call;
}

export async function listCalls(userId: string) {
  const calls = await prisma.call.findMany({
    where: {
      OR: [
        { callerId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 50,
    include: {
      caller: {
        select: { id: true, name: true, email: true },
      },
      receiver: {
        select: { id: true, name: true, email: true },
      },
      conversation: {
        select: { id: true, title: true },
      },
    },
  });

  return calls;
}
