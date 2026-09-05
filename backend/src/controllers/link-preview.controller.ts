import type { Request, Response } from "express";
import { getLinkPreview } from "../services/link-preview.service.js";

export async function getLinkPreviewHandler(request: Request, response: Response): Promise<void> {
  const rawUrl = request.query.url;

  if (!rawUrl || typeof rawUrl !== "string") {
    response.status(400).json({ message: "O parâmetro 'url' é obrigatório." });
    return;
  }

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    response.status(400).json({ message: "A URL deve começar com http:// ou https://" });
    return;
  }

  try {
    const preview = await getLinkPreview(trimmedUrl);
    response.json({ preview });
  } catch (error) {
    console.error("[LinkPreviewController] Erro ao buscar pré-visualização:", error);
    response.json({ preview: null });
  }
}
