import type { Request, Response } from "express";

import {
  createMessage,
  deleteMessage,
  listMessages,
  pinMessage,
  toggleReaction,
  toggleStarMessage,
  unpinMessage,
  updateMessage,
} from "../services/messages.service.js";
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
  const { content, type, fileUrl, fileName, fileSize, duration, replyToId, isForwarded } =
    request.body;

  const message = await createMessage(conversationId, userId, {
    content: typeof content === "string" ? content : "",
    type,
    fileUrl,
    fileName,
    fileSize,
    duration,
    replyToId,
    isForwarded,
  });

  return response.status(201).json({
    message,
  });
}

export async function update(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId, messageId } = request.params;
  const { content } = request.body;

  if (typeof content !== "string") {
    throw new AppError("O conteudo deve ser um texto valido.", 400);
  }

  const updatedMessage = await updateMessage(conversationId, messageId, userId, content);

  return response.json({
    message: updatedMessage,
  });
}

export async function remove(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId, messageId } = request.params;

  const deletedMessage = await deleteMessage(conversationId, messageId, userId);

  return response.json({
    message: deletedMessage,
  });
}

export async function react(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId, messageId } = request.params;
  const { emoji } = request.body;

  if (!emoji || typeof emoji !== "string") {
    throw new AppError("Emoji e obrigatorio.", 400);
  }

  const reactions = await toggleReaction(conversationId, messageId, userId, emoji.trim());

  return response.json({
    reactions,
  });
}

export async function star(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId, messageId } = request.params;

  const result = await toggleStarMessage(conversationId, messageId, userId);

  return response.json(result);
}

export async function pin(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId, messageId } = request.params;

  const result = await pinMessage(conversationId, messageId, userId);

  return response.json(result);
}

export async function unpin(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { conversationId } = request.params;

  const result = await unpinMessage(conversationId, userId);

  return response.json(result);
}


