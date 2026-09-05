import { Router } from "express";

import { create, index, react, remove, star, update } from "../controllers/messages.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const messagesRoutes = Router({
  mergeParams: true,
});

messagesRoutes.get("/", authMiddleware, asyncHandler(index));
messagesRoutes.post("/", authMiddleware, asyncHandler(create));
messagesRoutes.patch("/:messageId", authMiddleware, asyncHandler(update));
messagesRoutes.delete("/:messageId", authMiddleware, asyncHandler(remove));
messagesRoutes.post("/:messageId/reactions", authMiddleware, asyncHandler(react));
messagesRoutes.post("/:messageId/star", authMiddleware, asyncHandler(star));

