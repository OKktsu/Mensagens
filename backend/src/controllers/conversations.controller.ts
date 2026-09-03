import type { Request, Response } from "express";

import {
  createConversation,
  createGroupConversation,
  listConversations,
  markConversationAsRead,
} from "../services/conversations.service.js";
import { AppError } from "../utils/app-error.js";

function getAuthenticatedUserId(request: Request) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  return request.userId;
}

export async function index(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const conversations = await listConversations(userId);

  return response.json({
    conversations,
  });
}

export async function markAsRead(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId } = request.params;

  if (!conversationId) {
    throw new AppError("conversationId e obrigatorio.");
  }

  await markConversationAsRead(userId, String(conversationId));

  return response.json({
    ok: true,
  });
}

export async function create(request: Request, response: Response) {

  const userId = getAuthenticatedUserId(request);
  const { participantId, participantIds, title } = request.body;

  // Criação de Grupo
  if (Array.isArray(participantIds) && participantIds.length > 0) {
    const conversation = await createGroupConversation(
      userId,
      participantIds.map(String),
      typeof title === "string" ? title : undefined,
    );

    return response.status(201).json({
      conversation,
    });
  }

  // Criação de Conversa Direta (1 a 1)
  if (participantId) {
    const conversation = await createConversation(userId, String(participantId));

    return response.status(201).json({
      conversation,
    });
  }

  throw new AppError("participantId ou participantIds e obrigatorio.");
}

