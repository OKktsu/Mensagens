import { Router } from "express";
import { getLinkPreviewHandler } from "../controllers/link-preview.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const linkPreviewRoutes = Router();

linkPreviewRoutes.get("/", authMiddleware, asyncHandler(getLinkPreviewHandler));
