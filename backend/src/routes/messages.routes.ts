import { Router } from "express";

import { create, index } from "../controllers/messages.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const messagesRoutes = Router({
  mergeParams: true,
});

messagesRoutes.get("/", authMiddleware, asyncHandler(index));
messagesRoutes.post("/", authMiddleware, asyncHandler(create));
