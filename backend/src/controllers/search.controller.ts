import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { searchContent, type SearchCategory } from "../services/search.service.js";

export async function searchHandler(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const currentUserId = request.user?.id;
  if (!currentUserId) {
    response.status(401).json({ message: "Usuário não autenticado." });
    return;
  }

  const query = typeof request.query.q === "string" ? request.query.q : "";
  const category = (
    typeof request.query.category === "string" ? request.query.category : "all"
  ) as SearchCategory;
  const conversationId =
    typeof request.query.conversationId === "string" ? request.query.conversationId : undefined;

  const results = await searchContent(currentUserId, query, category, conversationId);
  response.json({ results });
}
