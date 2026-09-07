import { Router } from "express";

import {
  accept,
  cancel,
  create,
  received,
  reject,
  sent,
} from "../controllers/conversation-requests.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const conversationRequestsRoutes = Router();

conversationRequestsRoutes.use(authMiddleware);
conversationRequestsRoutes.get("/received", asyncHandler(received));
conversationRequestsRoutes.get("/sent", asyncHandler(sent));
conversationRequestsRoutes.post("/", asyncHandler(create));
conversationRequestsRoutes.post("/:requestId/accept", asyncHandler(accept));
conversationRequestsRoutes.post("/:requestId/reject", asyncHandler(reject));
conversationRequestsRoutes.delete("/:requestId", asyncHandler(cancel));