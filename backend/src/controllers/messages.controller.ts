import type { Request, Response } from "express";

import { createMessage, listMessages } from "../services/messages.service.js";
import { AppError } from "../utils/app-error.js";

function getAuthenticatedUserId(request: Request) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  return request.userId;
}

export async function index(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId } = request.params;
  const messages = await listMessages(conversationId, userId);

  return response.json({
    messages,
  });
}

export async function create(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId } = request.params;
  const { content, type, fileUrl, fileName, fileSize, duration } = request.body;

  const message = await createMessage(conversationId, userId, {
    content: typeof content === "string" ? content : "",
    type,
    fileUrl,
    fileName,
    fileSize,
    duration,
  });

  return response.status(201).json({
    message,
  });
}

