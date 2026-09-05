import { Router } from "express";
import { index, create } from "../controllers/calls.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const callsRoutes = Router();

callsRoutes.get("/", authMiddleware, asyncHandler(index));
callsRoutes.post("/", authMiddleware, asyncHandler(create));
