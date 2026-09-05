import cors from "cors";
import express from "express";

import { isFrontendOriginAllowed } from "./config/frontend-origins.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { callsRoutes } from "./routes/calls.routes.js";
import { conversationsRoutes } from "./routes/conversations.routes.js";
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

        callback(new Error("Origem nao permitida pelo CORS."));
      },
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
  app.use("/calls", callsRoutes);
  app.use(errorMiddleware);

  return app;
}

