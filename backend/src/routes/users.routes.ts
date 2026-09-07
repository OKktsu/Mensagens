import { Router } from "express";
import multer from "multer";

import {
  index,
  search,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  uploadBanner,
  removeBanner,
} from "../controllers/users.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const usersRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para fotos de perfil e banner
  },
});

usersRoutes.use(authMiddleware);

usersRoutes.get("/search", asyncHandler(search));
usersRoutes.get("/", asyncHandler(index));
usersRoutes.get("/profile", asyncHandler(getProfile));
usersRoutes.get("/profile/:id", asyncHandler(getProfile));
usersRoutes.patch("/profile", asyncHandler(updateProfile));

usersRoutes.post("/avatar", upload.single("avatar"), asyncHandler(uploadAvatar));
usersRoutes.delete("/avatar", asyncHandler(removeAvatar));

usersRoutes.post("/banner", upload.single("banner"), asyncHandler(uploadBanner));
usersRoutes.delete("/banner", asyncHandler(removeBanner));

