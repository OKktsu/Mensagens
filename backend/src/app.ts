import path from "node:path";
import cors from "cors";
import express from "express";

import { isFrontendOriginAllowed } from "./config/frontend-origins.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { callsRoutes } from "./routes/calls.routes.js";
import { conversationRequestsRoutes } from "./routes/conversation-requests.routes.js";
import { conversationsRoutes } from "./routes/conversations.routes.js";
import { linkPreviewRoutes } from "./routes/link-preview.routes.js";
import { searchRoutes } from "./routes/search.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { usersRoutes } from "./routes/users.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isFrontendOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        if (origin.includes("vercel.app") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
          callback(null, true);
          return;
        }
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.options("*", cors());
  app.use(express.json());

  // Servidor de arquivos estáticos para uploads (imagens, áudios, documentos)
  const uploadsPath = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "mensagens-api",
    });
  });

  app.use("/auth", authRoutes);
  app.use("/users", usersRoutes);
  app.use("/conversations", conversationsRoutes);
  app.use("/conversation-requests", conversationRequestsRoutes);
  app.use("/calls", callsRoutes);
  app.use("/upload", uploadRoutes);
  app.use("/link-preview", linkPreviewRoutes);
  app.use("/search", searchRoutes);
  app.use(errorMiddleware);

  return app;
}


