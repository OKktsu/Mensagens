import { Router } from "express";
import { searchHandler } from "../controllers/search.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const searchRoutes = Router();

searchRoutes.get("/", authMiddleware, asyncHandler(searchHandler));
