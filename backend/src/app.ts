import cors from "cors";
import express from "express";

import { getAllowedFrontendOrigins } from "./config/frontend-origins.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { conversationsRoutes } from "./routes/conversations.routes.js";
import { usersRoutes } from "./routes/users.routes.js";

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedFrontendOrigins();

  app.use(
    cors({
      origin: allowedOrigins,
    }),
  );
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "mensagens-api",
    });
  });

  app.use("/auth", authRoutes);
  app.use("/users", usersRoutes);
  app.use("/conversations", conversationsRoutes);
  app.use(errorMiddleware);

  return app;
}
