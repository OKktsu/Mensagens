import { Router } from "express";

import { index } from "../controllers/users.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const usersRoutes = Router();

usersRoutes.get("/", authMiddleware, asyncHandler(index));
