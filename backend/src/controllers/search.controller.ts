import type { Request, Response } from "express";
import { searchContent, type SearchCategory } from "../services/search.service.js";
import { AppError } from "../utils/app-error.js";

function getAuthenticatedUserId(request: Request): string {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }
  return request.userId;
}

export async function searchHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const currentUserId = getAuthenticatedUserId(request);

  const query = typeof request.query.q === "string" ? request.query.q : "";
  const category = (
    typeof request.query.category === "string" ? request.query.category : "all"
  ) as SearchCategory;
  const conversationId =
    typeof request.query.conversationId === "string" ? request.query.conversationId : undefined;

  const results = await searchContent(currentUserId, query, category, conversationId);
  response.json({ results });
}

