import type { Request, Response } from "express";

import {
  createConversation,
  listConversations,
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

export async function create(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { participantId } = request.body;

  if (!participantId) {
    throw new AppError("participantId e obrigatorio.");
  }

  const conversation = await createConversation(userId, String(participantId));

  return response.status(201).json({
    conversation,
  });
}
