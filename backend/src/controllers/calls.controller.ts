import type { Request, Response } from "express";
import { createCall, listCalls } from "../services/calls.service.js";
import { AppError } from "../utils/app-error.js";

function getAuthenticatedUserId(request: Request) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  return request.userId;
}

export async function index(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const calls = await listCalls(userId);

  return response.json({ calls });
}

export async function create(request: Request, response: Response) {
  const userId = getAuthenticatedUserId(request);
  const { receiverId, conversationId, type, status, duration, startedAt, endedAt } = request.body;

  const call = await createCall(userId, {
    receiverId: String(receiverId ?? ""),
    conversationId: conversationId ? String(conversationId) : undefined,
    type: type === "video" ? "video" : "audio",
    status: ["completed", "missed", "rejected"].includes(status) ? status : "completed",
    duration: Number(duration || 0),
    startedAt,
    endedAt,
  });

  return response.status(201).json({ call });
}
