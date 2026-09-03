import { Router } from "express";

import { create, index, markAsRead } from "../controllers/conversations.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { messagesRoutes } from "./messages.routes.js";

export const conversationsRoutes = Router();

conversationsRoutes.get("/", authMiddleware, asyncHandler(index));
conversationsRoutes.post("/", authMiddleware, asyncHandler(create));
conversationsRoutes.post("/:conversationId/read", authMiddleware, asyncHandler(markAsRead));
conversationsRoutes.use("/:conversationId/messages", messagesRoutes);

