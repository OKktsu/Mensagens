import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { AppError } from "../utils/app-error.js";

export const uploadRoutes = Router();

// Garante que a pasta uploads existe
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer DiskStorage
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || "";
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    cb(null, `${uniqueSuffix}-${cleanName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB
  },
});

uploadRoutes.post(
  "/",
  authMiddleware,
  upload.single("file"),
  (request, response) => {
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

    return response.status(201).json({
      fileUrl: `/uploads/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      type,
    });
  },
);
