import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { uploadToStorage } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

export const uploadRoutes = Router();

// Configuração do Multer com MemoryStorage (sem disco efêmero)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Limite de 25MB
  },
});

uploadRoutes.post(
  "/",
  authMiddleware,
  upload.single("file"),
  async (request, response) => {
    const file = request.file;

    if (!file) {
      throw new AppError("Nenhum arquivo enviado.", 400);
    }

    let type: "image" | "audio" | "file" = "file";
    if (file.mimetype.startsWith("image/")) {
      type = "image";
    } else if (file.mimetype.startsWith("audio/")) {
      type = "audio";
    }

    try {
      // Faz upload direto da memória para o Supabase Storage Privado
      const { path: storagePath, signedUrl } = await uploadToStorage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      return response.status(201).json({
        fileUrl: signedUrl,
        filePath: storagePath,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        type,
      });
    } catch (err) {
      console.error("[Upload] Erro ao enviar para o Supabase:", err);
      throw new AppError(
        err instanceof Error ? err.message : "Falha ao processar upload do arquivo.",
        500,
      );
    }
  },
);
