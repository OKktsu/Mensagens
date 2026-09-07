import type { Request, Response } from "express";

import { AppError } from "../utils/app-error.js";
import {
  listUsers,
  getUserById,
  updateUserProfile,
  updateUserAvatar,
  updateUserBanner,
} from "../services/users.service.js";
import { uploadToStorage } from "../config/supabase.js";
import { emitUserProfileUpdated } from "../realtime/socket.js";

export async function index(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const users = await listUsers(request.userId);

  return response.json({
    users,
  });
}

export async function getProfile(request: Request, response: Response) {
  const targetUserId = request.params.id || request.userId;
  if (!targetUserId) {
    throw new AppError("Usuario nao especificado.", 400);
  }

  const user = await getUserById(targetUserId);

  return response.json({
    user,
  });
}

export async function updateProfile(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const { name, bio, bannerColor, customStatus, statusEmoji } = request.body;

  const updatedUser = await updateUserProfile(request.userId, {
    name,
    bio,
    bannerColor,
    customStatus,
    statusEmoji,
  });

  emitUserProfileUpdated(updatedUser);

  return response.json({
    user: updatedUser,
  });
}

export async function uploadAvatar(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const file = request.file;
  if (!file) {
    throw new AppError("Nenhuma imagem de avatar foi enviada.", 400);
  }

  if (!file.mimetype.startsWith("image/")) {
    throw new AppError("O arquivo de avatar deve ser uma imagem.", 400);
  }

  const { path: storagePath } = await uploadToStorage(
    file.buffer,
    `avatar_${request.userId}_${file.originalname}`,
    file.mimetype,
  );

  const updatedUser = await updateUserAvatar(request.userId, storagePath);

  emitUserProfileUpdated(updatedUser);

  return response.json({
    user: updatedUser,
  });
}

export async function removeAvatar(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const updatedUser = await updateUserAvatar(request.userId, null);

  emitUserProfileUpdated(updatedUser);

  return response.json({
    user: updatedUser,
  });
}

export async function uploadBanner(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const file = request.file;
  if (!file) {
    throw new AppError("Nenhuma imagem de banner foi enviada.", 400);
  }

  if (!file.mimetype.startsWith("image/")) {
    throw new AppError("O arquivo de banner deve ser uma imagem.", 400);
  }

  const { path: storagePath } = await uploadToStorage(
    file.buffer,
    `banner_${request.userId}_${file.originalname}`,
    file.mimetype,
  );

  const updatedUser = await updateUserBanner(request.userId, storagePath);

  emitUserProfileUpdated(updatedUser);

  return response.json({
    user: updatedUser,
  });
}

export async function removeBanner(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const updatedUser = await updateUserBanner(request.userId, null);

  emitUserProfileUpdated(updatedUser);

  return response.json({
    user: updatedUser,
  });
}

