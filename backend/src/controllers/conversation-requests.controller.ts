import type { Request, Response } from "express";

import {
  acceptConversationRequest,
  cancelConversationRequest,
  createConversationRequest,
  listReceivedConversationRequests,
  listSentConversationRequests,
  rejectConversationRequest,
} from "../services/conversation-requests.service.js";
import { AppError } from "../utils/app-error.js";

function getAuthenticatedUserId(request: Request) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  return request.userId;
}

export async function create(request: Request, response: Response) {
  const senderId = getAuthenticatedUserId(request);
  const conversationRequest = await createConversationRequest(senderId, String(request.body.receiverId ?? ""));

  return response.status(201).json({ conversationRequest });
}

export async function received(request: Request, response: Response) {
  const conversationRequests = await listReceivedConversationRequests(getAuthenticatedUserId(request));
  return response.json({ conversationRequests });
}

export async function sent(request: Request, response: Response) {
  const conversationRequests = await listSentConversationRequests(getAuthenticatedUserId(request));
  return response.json({ conversationRequests });
}

export async function accept(request: Request, response: Response) {
  const conversation = await acceptConversationRequest(request.params.requestId, getAuthenticatedUserId(request));
  return response.json({ conversation });
}

export async function reject(request: Request, response: Response) {
  await rejectConversationRequest(request.params.requestId, getAuthenticatedUserId(request));
  return response.status(204).send();
}

export async function cancel(request: Request, response: Response) {
  await cancelConversationRequest(request.params.requestId, getAuthenticatedUserId(request));
  return response.status(204).send();
}